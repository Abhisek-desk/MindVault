import { apiRequest } from "./api";

import {
  db,
  type LocalNote,
  type LocalFolder,
  type LocalSyncChange,
} from "../db/database";

import {
  getPendingChanges,
  markChangeAsProcessing,
  markChangeAsFailed,
  resetPendingChanges,
  getSyncCursor,
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
// MARK ENTITY AS SYNCED
// =====================================

const markEntityAsSynced = async (change: LocalSyncChange): Promise<void> => {
  const remainingChanges = await db.syncQueue
    .where("[entityType+entityId]")
    .equals([change.entityType, change.entityId])
    .count();

  if (remainingChanges > 0) return;

  // Never overwrite a conflict status.
  const conflictId = `${change.entityType}:${change.entityId}`;
  const conflict = await db.conflicts.get(conflictId);

  if (conflict) return;

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

// =====================================
// PUSH LOCAL CHANGES TO SERVER
// =====================================

export const pushLocalChanges = async (): Promise<void> => {
  while (true) {
    const pendingChanges = await getPendingChanges();

    if (pendingChanges.length === 0) {
      break;
    }

    // Exclude changes belonging to unresolved conflicts.
    const eligibleChanges = await Promise.all(
      pendingChanges.map(async (change) => {
        const conflictId = `${change.entityType}:${change.entityId}`;

        const conflict = await db.conflicts.get(conflictId);

        return conflict ? null : change;
      }),
    );

    const batch = eligibleChanges
      .filter((change): change is LocalSyncChange => change !== null)
      .slice(0, 50);

    if (batch.length === 0) {
      break;
    }

    const validChanges = batch.filter((change) => change.id !== undefined);

    if (validChanges.length === 0) {
      break;
    }

    try {
      // Step 1: Mark changes as processing.
      for (const change of validChanges) {
        await markChangeAsProcessing(change.id!);
      }

      // Step 2: Upload changes to the server.
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

      // Step 3: Verify server confirmation.
      if (response.processed + response.duplicates !== validChanges.length) {
        throw new Error("Unexpected synchronization response");
      }

      // Step 4: Remove confirmed changes.
      await db.transaction(
        "rw",
        db.syncQueue,
        db.notes,
        db.folders,
        db.conflicts,
        async () => {
          for (const change of validChanges) {
            await db.syncQueue.delete(change.id!);

            await markEntityAsSynced(change);
          }
        },
      );

      console.log(`Successfully synchronized ${validChanges.length} changes.`);
    } catch (error) {
      console.error("Push synchronization failed:", error);

      // Preserve changes for a future retry.
      for (const change of validChanges) {
        await markChangeAsFailed(change.id!);
      }

      throw error;
    }
  }
};

// =====================================
// APPLY SERVER CHANGES LOCALLY
// WITH CONFLICT DETECTION
// =====================================

const applyServerChanges = async (
  changes: ServerChange[],
  nextCursor: string | null,
): Promise<void> => {
  await db.transaction(
    "rw",
    db.notes,
    db.folders,
    db.syncQueue,
    db.conflicts,
    db.syncMeta,
    async () => {
      for (const change of changes) {
        // Check for pending local changes.
        const hasLocalChanges = await db.syncQueue
          .where("[entityType+entityId]")
          .equals([change.entityType, change.entityId])
          .count();

        // Check existing conflict.
        const existingConflict = await db.conflicts.get(
          `${change.entityType}:${change.entityId}`,
        );

        // =================================
        // HANDLE CONFLICT
        // =================================

        if (hasLocalChanges > 0 || existingConflict) {
          let localData: Record<string, unknown> | null = null;

          // Preserve local note.
          if (change.entityType === "note") {
            const localNote = await db.notes.get(change.entityId);

            if (localNote) {
              localData = { ...localNote };
            }
          }

          // Preserve local folder.
          if (change.entityType === "folder") {
            const localFolder = await db.folders.get(change.entityId);

            if (localFolder) {
              localData = { ...localFolder };
            }
          }

          const conflict = {
            id: `${change.entityType}:${change.entityId}`,
            entityType: change.entityType,
            entityId: change.entityId,
            operation: change.operation,
            localData,

            // Preserve incoming server version.
            serverData: change.data ?? null,

            serverChangeId: change.id,

            detectedAt:
              existingConflict?.detectedAt ?? new Date().toISOString(),
          };

          await db.conflicts.put(conflict);

          // Mark local entity as conflicted.
          if (change.entityType === "note") {
            await db.notes.update(change.entityId, {
              syncStatus: "conflict",
            });
          }

          if (change.entityType === "folder") {
            await db.folders.update(change.entityId, {
              syncStatus: "conflict",
            });
          }

          console.log(
            `Conflict detected: ${change.entityType} ${change.entityId}`,
          );

          continue;
        }

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

      // =================================
      // SAVE CURSOR ATOMICALLY
      // =================================

      if (nextCursor) {
        await db.syncMeta.put({
          key: "lastSyncCursor",
          value: nextCursor,
        });
      }
    },
  );
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

    // Apply changes and save cursor atomically.
    await applyServerChanges(response.changes, response.nextCursor);

    if (response.nextCursor) {
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

    // FIRST: Pull server changes and detect conflicts.
    await pullServerChanges();

    // SECOND: Push changes that have no unresolved conflicts.
    await pushLocalChanges();

    console.log("Mind Vault synchronization completed.");
  } catch (error) {
    console.error("Mind Vault synchronization failed:", error);
    throw error;
  } finally {
    syncInProgress = false;
  }
};
