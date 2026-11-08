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
  clientMutationId?: string;
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
// GET CURRENT ENTITY VERSION
// =====================================

const getEntityVersion = async (
  change: LocalSyncChange,
): Promise<number> => {
  if (change.expectedVersion !== undefined) {
    return change.expectedVersion;
  }

  if (change.entityType === "note") {
    const note = await db.notes.get(change.entityId);

    if (note) return note.version;
  }

  if (change.entityType === "folder") {
    const folder = await db.folders.get(change.entityId);

    if (folder) return folder.version;
  }

  throw new Error(
    `Cannot determine expected version for ${change.entityType} ${change.entityId}`,
  );
};

// =====================================
// MARK ENTITY AS SYNCED
// =====================================

const markEntityAsSynced = async (
  change: LocalSyncChange,
): Promise<void> => {
  const remainingChanges = await db.syncQueue
    .where("[entityType+entityId]")
    .equals([change.entityType, change.entityId])
    .count();

  if (remainingChanges > 0) return;

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
// UPDATE LOCAL VERSION AFTER PUSH
// =====================================

const updateLocalVersionAfterPush = async (
  change: LocalSyncChange,
): Promise<void> => {
  if (change.operation === "delete") {
    return;
  }

  let newVersion = 1;

  if (change.operation === "update") {
    const expectedVersion = await getEntityVersion(change);

    newVersion = expectedVersion + 1;
  }

  if (
    change.operation === "create" &&
    typeof change.data?.version === "number"
  ) {
    newVersion = change.data.version;
  }

  if (change.entityType === "note") {
    await db.notes.update(change.entityId, {
      version: newVersion,
    });
  }

  if (change.entityType === "folder") {
    await db.folders.update(change.entityId, {
      version: newVersion,
    });
  }

  // An edit or deletion may have been queued while this
  // operation was being uploaded. Advance its expected version.
  const remainingChanges = await db.syncQueue
    .where("[entityType+entityId]")
    .equals([change.entityType, change.entityId])
    .toArray();

  for (const queuedChange of remainingChanges) {
    if (queuedChange.operation !== "create") {
      await db.syncQueue.update(queuedChange.id!, {
        expectedVersion: newVersion,
      });
    }
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
      .filter(
        (change): change is LocalSyncChange => change !== null,
      )
      .slice(0, 50);

    if (batch.length === 0) {
      break;
    }

    const validChanges = batch.filter(
      (change) => change.id !== undefined,
    );

    if (validChanges.length === 0) {
      break;
    }

    try {
      // Step 1: Prepare expected versions.
      const payloadChanges = await Promise.all(
        validChanges.map(async (change) => {
          if (change.operation === "create") {
            return {
              entityType: change.entityType,
              entityId: change.entityId,
              operation: change.operation,
              clientMutationId: change.clientMutationId,
              ...(change.data !== undefined
                ? { data: change.data }
                : {}),
            };
          }

          const expectedVersion = await getEntityVersion(change);

          return {
            entityType: change.entityType,
            entityId: change.entityId,
            operation: change.operation,
            clientMutationId: change.clientMutationId,
            expectedVersion,
            ...(change.data !== undefined
              ? { data: change.data }
              : {}),
          };
        }),
      );

      // Step 2: Mark changes as processing.
      for (const change of validChanges) {
        await markChangeAsProcessing(change.id!);
      }

      // Step 3: Upload changes to the server.
      const response = await apiRequest<PushResponse>(
        "/sync/push",
        {
          method: "POST",
          body: {
            changes: payloadChanges,
          },
        },
      );

      // Step 4: Verify server confirmation.
      if (
        response.processed + response.duplicates !==
        validChanges.length
      ) {
        throw new Error(
          "Unexpected synchronization response",
        );
      }

      // Step 5: Update versions and remove confirmed changes.
      await db.transaction(
        "rw",
        db.syncQueue,
        db.notes,
        db.folders,
        db.conflicts,
        async () => {
          for (const change of validChanges) {
            await db.syncQueue.delete(change.id!);

            await updateLocalVersionAfterPush(change);

            await markEntityAsSynced(change);
          }
        },
      );

      console.log(
        `Successfully synchronized ${validChanges.length} changes.`,
      );
    } catch (error) {
      console.error(
        "Push synchronization failed:",
        error,
      );

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
        const hasLocalChanges = await db.syncQueue
          .where("[entityType+entityId]")
          .equals([change.entityType, change.entityId])
          .count();

        const conflictId =
          `${change.entityType}:${change.entityId}`;

        const existingConflict =
          await db.conflicts.get(conflictId);

        // =================================
        // HANDLE CONFLICT
        // =================================

        if (hasLocalChanges > 0 || existingConflict) {
          let localData: Record<string, unknown> | null = null;

          if (change.entityType === "note") {
            const localNote = await db.notes.get(
              change.entityId,
            );

            if (localNote) {
              localData = { ...localNote };
            }
          }

          if (change.entityType === "folder") {
            const localFolder = await db.folders.get(
              change.entityId,
            );

            if (localFolder) {
              localData = { ...localFolder };
            }
          }

          const conflict = {
            id: conflictId,
            entityType: change.entityType,
            entityId: change.entityId,
            operation: change.operation,
            localData,
            serverData: change.data ?? null,
            serverChangeId: change.id,
            detectedAt:
              existingConflict?.detectedAt ??
              new Date().toISOString(),
          };

          await db.conflicts.put(conflict);

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

          const existingNote = await db.notes.get(
            change.entityId,
          );

          const note: LocalNote = {
            id: change.entityId,

            title:
              typeof data.title === "string"
                ? data.title
                : existingNote?.title ?? "Untitled",

            content:
              typeof data.content === "string"
                ? data.content
                : existingNote?.content ?? "",

            folderId:
              data.folderId === null
                ? null
                : typeof data.folderId === "string"
                  ? data.folderId
                  : existingNote?.folderId ?? null,

            version:
              typeof data.version === "number"
                ? data.version
                : existingNote?.version ?? 1,

            createdAt:
              typeof data.createdAt === "string"
                ? data.createdAt
                : existingNote?.createdAt ?? change.createdAt,

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

          const existingFolder = await db.folders.get(
            change.entityId,
          );

          const folder: LocalFolder = {
            id: change.entityId,

            name:
              typeof data.name === "string"
                ? data.name
                : existingFolder?.name ?? "Untitled folder",

            color:
              typeof data.color === "string"
                ? data.color
                : existingFolder?.color ?? "#F47768",

            version:
              typeof data.version === "number"
                ? data.version
                : existingFolder?.version ?? 1,

            createdAt:
              typeof data.createdAt === "string"
                ? data.createdAt
                : existingFolder?.createdAt ?? change.createdAt,

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
      throw new Error(
        "Failed to retrieve server changes",
      );
    }

    await applyServerChanges(
      response.changes,
      response.nextCursor,
    );

    if (response.nextCursor) {
      cursor = response.nextCursor;
    }

    if (!response.hasMore) {
      break;
    }

    if (!response.nextCursor) {
      throw new Error(
        "Server returned an invalid sync cursor",
      );
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
    console.log(
      "Mind Vault is offline. Sync postponed.",
    );

    return;
  }

  syncInProgress = true;

  try {
    // Retry changes interrupted by an earlier session.
    await resetPendingChanges();

    // FIRST: Pull server changes and detect conflicts.
    await pullServerChanges();

    // SECOND: Push changes without unresolved conflicts.
    await pushLocalChanges();

    console.log(
      "Mind Vault synchronization completed.",
    );
  } catch (error) {
    console.error(
      "Mind Vault synchronization failed:",
      error,
    );

    throw error;
  } finally {
    syncInProgress = false;
  }
};