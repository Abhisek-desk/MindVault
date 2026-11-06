import { apiRequest } from "./api";

import { db,type LocalNote,type LocalFolder,type LocalSyncChange } from "../db/database";

import {
  getPendingChanges,
  markChangeAsProcessing,
  markChangeAsFailed,
  removeSyncChange,
  resetPendingChanges,
  getSyncCursor,
  saveSyncCursor,
} from "../db/sync.db";

// =====================================
// API RESPONSE TYPES
// =====================================

interface PushResponse {
  success: boolean;
  processed: number;
  duplicates: number;
}

interface ServerChange {
  id: string;
  entityType: "note" | "folder";
  entityId: string;
  operation: "create" | "update" | "delete";
  data?: Record<string, unknown>;
  createdAt: string;
}

interface PullResponse {
  success: boolean;
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
  changes: ServerChange[];
}

// =====================================
// PREVENT SIMULTANEOUS SYNC OPERATIONS
// =====================================

let syncInProgress = false;

// =====================================
// PUSH LOCAL CHANGES TO SERVER
// =====================================

const markEntityAsSynced = async (change: LocalSyncChange): Promise<void> => {
  const remainingChanges = await db.syncQueue
    .where("[entityType+entityId]")
    .equals([change.entityType, change.entityId])
    .count();

  // Don't mark synced if another change is still queued.
  if (remainingChanges > 0) return;

  if (change.entityType === "note") {
    await db.notes.update(change.entityId, {
      syncStatus: "synced",
    });
  }

  if (change.entityType === "folder") {
    await db.folders.update(change.entityId, {
      syncStatus: "synced",
    });
  }
};

export const pushLocalChanges = async (): Promise<void> => {
  // Process pending changes in batches of 50.
  while (true) {
    const pendingChanges = await getPendingChanges();

    if (pendingChanges.length === 0) {
      break;
    }

    const batch = pendingChanges.slice(0, 50);

    const validChanges = batch.filter((change) => change.id !== undefined);

    if (validChanges.length === 0) {
      break;
    }

    try {
      for (const change of validChanges) {
        await removeSyncChange(change.id!);
        await markEntityAsSynced(change);
      }

      const response = await apiRequest<PushResponse>("/sync/push", {
        method: "POST",
        body: {
          changes: validChanges.map((change) => ({
            entityType: change.entityType,
            entityId: change.entityId,
            operation: change.operation,
            clientMutationId: change.clientMutationId,
            ...(change.data !== undefined ? { data: change.data } : {}),
          })),
        },
      });

      if (response.processed + response.duplicates !== validChanges.length) {
        throw new Error("Unexpected synchronization response");
      }

      for (const change of validChanges) {
        await removeSyncChange(change.id!);
      }
    } catch (error) {
      console.error("Push synchronization failed:", error);

      for (const change of validChanges) {
        await markChangeAsFailed(change.id!);
      }

      throw error;
    }
  }
};

// =====================================
// APPLY SERVER CHANGES LOCALLY
// =====================================

const applyServerChanges = async (changes: ServerChange[]): Promise<void> => {
  await db.transaction("rw", db.notes, db.folders, async () => {
    for (const change of changes) {
      const data = change.data ?? {};

      // =================================
      // NOTE CHANGES
      // =================================

      if (change.entityType === "note") {
        if (change.operation === "delete") {
          await db.notes.delete(change.entityId);
          continue;
        }

        const existingNote = await db.notes.get(change.entityId);

        const note: LocalNote = {
          id: change.entityId,
          title:
            typeof data.title === "string"
              ? data.title
              : (existingNote?.title ?? "Untitled"),

          content:
            typeof data.content === "string"
              ? data.content
              : (existingNote?.content ?? ""),

          folderId:
            data.folderId === null
              ? null
              : typeof data.folderId === "string"
                ? data.folderId
                : (existingNote?.folderId ?? null),

          createdAt:
            typeof data.createdAt === "string"
              ? data.createdAt
              : (existingNote?.createdAt ?? change.createdAt),

          updatedAt:
            typeof data.updatedAt === "string"
              ? data.updatedAt
              : change.createdAt,

          syncStatus: "synced",
        };

        await db.notes.put(note);
      }

      // =================================
      // FOLDER CHANGES
      // =================================

      if (change.entityType === "folder") {
        if (change.operation === "delete") {
          await db.folders.delete(change.entityId);
          continue;
        }

        const existingFolder = await db.folders.get(change.entityId);

        const folder: LocalFolder = {
          id: change.entityId,

          name:
            typeof data.name === "string"
              ? data.name
              : (existingFolder?.name ?? "Untitled folder"),

          color:
            typeof data.color === "string"
              ? data.color
              : (existingFolder?.color ?? "#F47768"),

          createdAt:
            typeof data.createdAt === "string"
              ? data.createdAt
              : (existingFolder?.createdAt ?? change.createdAt),

          updatedAt:
            typeof data.updatedAt === "string"
              ? data.updatedAt
              : change.createdAt,

          syncStatus: "synced",
        };

        await db.folders.put(folder);
      }
    }
  });
};

// =====================================
// PULL SERVER CHANGES
// =====================================

export const pullServerChanges = async (): Promise<void> => {
  let cursor = await getSyncCursor();

  while (true) {
    const endpoint = cursor
      ? `/sync/pull?cursor=${encodeURIComponent(cursor)}&limit=100`
      : "/sync/pull?limit=100";

    const response = await apiRequest<PullResponse>(endpoint);

    if (!response.success) {
      throw new Error("Failed to retrieve server changes");
    }

    // Apply changes before saving the cursor.
    await applyServerChanges(response.changes);

    // Save cursor only after local changes are committed.
    if (response.nextCursor) {
      await saveSyncCursor(response.nextCursor);
      cursor = response.nextCursor;
    }

    if (!response.hasMore) {
      break;
    }

    if (!response.nextCursor) {
      throw new Error("Server returned an invalid sync cursor");
    }
  }
};

// =====================================
// COMPLETE SYNCHRONIZATION
// =====================================

export const synchronizeData = async (): Promise<void> => {
  if (syncInProgress) {
    return;
  }

  if (!navigator.onLine) {
    console.log("Mind Vault is offline. Sync postponed.");
    return;
  }

  syncInProgress = true;

  try {
    // Retry changes interrupted by an earlier session.
    await resetPendingChanges();

    // Upload local changes first.
    await pushLocalChanges();

    // Download server changes afterward.
    await pullServerChanges();

    console.log("Mind Vault synchronization completed.");
  } catch (error) {
    console.error("Mind Vault synchronization failed:", error);
    throw error;
  } finally {
    syncInProgress = false;
  }
};
