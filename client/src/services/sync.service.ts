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
// VALIDATE SERVER SYNC RESPONSES
// =====================================

const validatePullResponse = (response: PullResponse): void => {
  if (
    !response ||
    response.success !== true ||
    !Number.isInteger(response.count) ||
    response.count < 0 ||
    typeof response.hasMore !== "boolean" ||
    !Array.isArray(response.changes)
  ) {
    throw new Error("Invalid synchronization response.");
  }

  if (response.count !== response.changes.length) {
    throw new Error("Synchronization response count mismatch.");
  }

  if (
    response.nextCursor !== null &&
    (typeof response.nextCursor !== "string" ||
      !/^[a-fA-F0-9]{24}$/.test(response.nextCursor))
  ) {
    throw new Error("Invalid synchronization cursor.");
  }

  for (const change of response.changes) {
    if (
      !change ||
      typeof change.id !== "string" ||
      !/^[a-fA-F0-9]{24}$/.test(change.id) ||
      !["note", "folder"].includes(change.entityType) ||
      !/^[a-fA-F0-9]{24}$/.test(change.entityId) ||
      !["create", "update", "delete"].includes(change.operation) ||
      typeof change.createdAt !== "string" ||
      Number.isNaN(Date.parse(change.createdAt)) ||
      (change.data !== undefined &&
        (typeof change.data !== "object" ||
          change.data === null ||
          Array.isArray(change.data)))
    ) {
      throw new Error("Invalid server synchronization change.");
    }
  }
};

// =====================================
// VALIDATE PUSH RESPONSE
// =====================================

const validatePushResponse = (
  response: PushResponse,
  expectedCount: number,
): void => {
  if (
    !response ||
    response.success !== true ||
    !Number.isInteger(response.processed) ||
    response.processed < 0 ||
    !Number.isInteger(response.duplicates) ||
    response.duplicates < 0 ||
    response.processed + response.duplicates !== expectedCount
  ) {
    throw new Error("Invalid synchronization push response.");
  }
};

// =====================================
// VALIDATE OUTGOING SYNC CHANGES
// =====================================

const validateLocalChange = (change: LocalSyncChange): void => {
  if (
    !change ||
    !Number.isSafeInteger(change.id) ||
    change.id! < 1 ||
    !["note", "folder"].includes(change.entityType) ||
    typeof change.entityId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(change.entityId) ||
    !["create", "update", "delete"].includes(change.operation) ||
    typeof change.clientMutationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      change.clientMutationId,
    ) ||
    (change.expectedVersion !== undefined &&
      (!Number.isInteger(change.expectedVersion) ||
        change.expectedVersion < 1)) ||
    ((change.operation === "update" || change.operation === "delete") &&
      change.expectedVersion === undefined)
  ) {
    throw new Error("Invalid local synchronization change.");
  }

  if (change.data === undefined) {
    return;
  }

  if (
    typeof change.data !== "object" ||
    change.data === null ||
    Array.isArray(change.data)
  ) {
    throw new Error("Invalid synchronization payload data.");
  }

  const data = change.data as Record<string, unknown>;

  if (change.entityType === "note") {
    if (
      (data.title !== undefined &&
        (typeof data.title !== "string" ||
          data.title.trim().length < 1 ||
          data.title.trim().length > 200)) ||
      (data.content !== undefined &&
        (typeof data.content !== "string" || data.content.length > 20000)) ||
      (data.folderId !== undefined &&
        data.folderId !== null &&
        (typeof data.folderId !== "string" ||
          !/^[a-fA-F0-9]{24}$/.test(data.folderId)))
    ) {
      throw new Error("Invalid local note synchronization data.");
    }
  }

  if (change.entityType === "folder") {
    if (
      (data.name !== undefined &&
        (typeof data.name !== "string" ||
          data.name.trim().length < 1 ||
          data.name.trim().length > 50)) ||
      (data.color !== undefined &&
        (typeof data.color !== "string" ||
          !/^#[0-9A-Fa-f]{6}$/.test(data.color)))
    ) {
      throw new Error("Invalid local folder synchronization data.");
    }
  }
};

// =====================================
// PREVENT SIMULTANEOUS SYNC OPERATIONS
// =====================================

let syncInProgress = false;

// =====================================
// GET CURRENT ENTITY VERSION
// =====================================

const getEntityVersion = async (change: LocalSyncChange): Promise<number> => {
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

const markEntityAsSynced = async (change: LocalSyncChange): Promise<void> => {
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
      .filter((change): change is LocalSyncChange => change !== null)
      .slice(0, 50);

    if (batch.length === 0) {
      break;
    }

    const validChanges = batch.filter((change) => change.id !== undefined);

    if (validChanges.length > 50) {
      throw new Error("Synchronization batch exceeds the maximum size.");
    }

    const mutationIds = new Set<string>();

    for (const change of validChanges) {
      validateLocalChange(change);

      const mutationId = change.clientMutationId.toLowerCase();

      if (mutationIds.has(mutationId)) {
        throw new Error("Duplicate mutation ID in synchronization batch.");
      }

      mutationIds.add(mutationId);
    } 

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
              ...(change.data !== undefined ? { data: change.data } : {}),
            };
          }

          const expectedVersion = await getEntityVersion(change);

          return {
            entityType: change.entityType,
            entityId: change.entityId,
            operation: change.operation,
            clientMutationId: change.clientMutationId,
            expectedVersion,
            ...(change.data !== undefined ? { data: change.data } : {}),
          };
        }),
      );

      // Step 2: Mark changes as processing.
      for (const change of validChanges) {
        await markChangeAsProcessing(change.id!);
      }

      // Step 3: Upload changes to the server.
      const response = await apiRequest<PushResponse>("/sync/push", {
        method: "POST",
        body: {
          changes: payloadChanges,
        },
      });

      validatePushResponse(response, validChanges.length);

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
        const hasLocalChanges = await db.syncQueue
          .where("[entityType+entityId]")
          .equals([change.entityType, change.entityId])
          .count();

        const conflictId = `${change.entityType}:${change.entityId}`;

        const existingConflict = await db.conflicts.get(conflictId);

        // =================================
        // HANDLE CONFLICT
        // =================================

        if (hasLocalChanges > 0 || existingConflict) {
          let localData: Record<string, unknown> | null = null;

          if (change.entityType === "note") {
            const localNote = await db.notes.get(change.entityId);

            if (localNote) {
              localData = { ...localNote };
            }
          }

          if (change.entityType === "folder") {
            const localFolder = await db.folders.get(change.entityId);

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
              existingConflict?.detectedAt ?? new Date().toISOString(),
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

            version:
              typeof data.version === "number"
                ? data.version
                : (existingNote?.version ?? 1),

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

            version:
              typeof data.version === "number"
                ? data.version
                : (existingFolder?.version ?? 1),

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

  if (
    cursor !== null &&
    (typeof cursor !== "string" || !/^[a-fA-F0-9]{24}$/.test(cursor))
  ) {
    throw new Error("Invalid stored synchronization cursor.");
  }

  while (true) {
    const endpoint = cursor
      ? `/sync/pull?cursor=${encodeURIComponent(cursor)}&limit=100`
      : "/sync/pull?limit=100";

    const response = await apiRequest<PullResponse>(endpoint);
    validatePullResponse(response);

    if (!response.success) {
      throw new Error("Failed to retrieve server changes");
    }

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
// WITH CROSS-TAB LOCKING
// =====================================

const performSynchronization = async (): Promise<void> => {
  if (!navigator.onLine) {
    console.log("Mind Vault is offline. Sync postponed.");
    return;
  }

  // Retry changes interrupted by an earlier session.
  await resetPendingChanges();

  if (!navigator.onLine) {
    console.log("Connection lost. Sync postponed.");
    return;
  }

  // FIRST: Pull server changes and detect conflicts.
  await pullServerChanges();

  if (!navigator.onLine) {
    console.log("Connection lost. Sync postponed.");
    return;
  }

  // SECOND: Push changes without unresolved conflicts.
  await pushLocalChanges();

  console.log("Mind Vault synchronization completed.");
};

export const synchronizeData = async (): Promise<void> => {
  // Prevent simultaneous sync operations within this tab.
  if (syncInProgress) {
    return;
  }

  if (!navigator.onLine) {
    console.log("Mind Vault is offline. Sync postponed.");
    return;
  }

  syncInProgress = true;

  try {
    // Use browser-wide locking when supported.
    if (navigator.locks) {
      await navigator.locks.request(
        "mindvault-sync",
        { mode: "exclusive" },
        async () => {
          // Recheck connectivity after acquiring the lock.
          if (!navigator.onLine) {
            console.log("Mind Vault is offline. Sync postponed.");
            return;
          }

          await performSynchronization();
        },
      );
    } else {
      // Fallback for browsers without Web Locks support.
      await performSynchronization();
    }
  } catch (error) {
    console.error("Mind Vault synchronization failed:", error);
    throw error;
  } finally {
    syncInProgress = false;
  }
};
