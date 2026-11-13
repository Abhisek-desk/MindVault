import {
  db,
  withDatabaseLease,
  getActiveDatabaseUserId,
  type LocalSyncChange,
} from "./database";

// =====================================
// DIAGNOSTICS TYPES
// =====================================

export interface SyncDiagnostics {
  pending: number;
  processing: number;
  failed: number;
  conflicts: number;
  totalQueued: number;
}

// =====================================
// GET PENDING SYNC CHANGES
// =====================================

export const getPendingChanges = async (): Promise<LocalSyncChange[]> => {
  return withDatabaseLease(async () => {
    return db.syncQueue
      .where("status")
      .equals("pending")
      .sortBy("createdAt");
  });
};

// =====================================
// GET ALL QUEUED CHANGES
// =====================================

export const getAllSyncChanges = async (): Promise<LocalSyncChange[]> => {
  return withDatabaseLease(async () => {
    return db.syncQueue
      .orderBy("createdAt")
      .toArray();
  });
};

// =====================================
// GET SYNC DIAGNOSTICS
// =====================================

export const getSyncDiagnostics =
  async (): Promise<SyncDiagnostics> => {
    return withDatabaseLease(async () => {
      const [changes, conflicts] = await Promise.all([
        db.syncQueue.toArray(),
        db.conflicts.count(),
      ]);

      const pending = changes.filter(
        (change) => change.status === "pending",
      ).length;

      const processing = changes.filter(
        (change) => change.status === "processing",
      ).length;

      const failed = changes.filter(
        (change) => change.status === "failed",
      ).length;

      return {
        pending,
        processing,
        failed,
        conflicts,
        totalQueued: changes.length,
      };
    });
  };

// =====================================
// LAST SUCCESSFUL SYNCHRONIZATION
// =====================================

const LAST_SYNC_KEY = "lastSuccessfulSyncAt";

export const getLastSuccessfulSyncAt =
  async (): Promise<string | null> => {
    return withDatabaseLease(async () => {
      const metadata = await db.syncMeta.get(LAST_SYNC_KEY);

      if (!metadata) {
        return null;
      }

      const timestamp = metadata.value;

      if (
        typeof timestamp !== "string" ||
        !Number.isFinite(Date.parse(timestamp))
      ) {
        return null;
      }

      return timestamp;
    });
  };

export const saveLastSuccessfulSyncAt = async (
  timestamp: string,
  expectedUserId: string,
): Promise<void> => {
  if (
    typeof timestamp !== "string" ||
    !Number.isFinite(Date.parse(timestamp))
  ) {
    throw new Error("Invalid synchronization timestamp.");
  }

  if (
    typeof expectedUserId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(expectedUserId)
  ) {
    throw new Error("Invalid account ID.");
  }

  await withDatabaseLease(async () => {
    const activeUserId = getActiveDatabaseUserId();

    if (
      !activeUserId ||
      activeUserId !== expectedUserId.toLowerCase()
    ) {
      throw new Error("Account changed during synchronization.");
    }

    await db.syncMeta.put({
      key: LAST_SYNC_KEY,
      value: timestamp,
    });
  });
};

// =====================================
// MARK CHANGE AS PROCESSING
// =====================================

export const markChangeAsProcessing = async (
  id: number,
): Promise<void> => {
  await withDatabaseLease(async () => {
    await db.syncQueue.update(id, {
      status: "processing",
    });
  });
};

// =====================================
// MARK CHANGE AS FAILED
// =====================================

export const markChangeAsFailed = async (
  id: number,
): Promise<void> => {
  await withDatabaseLease(async () => {
    await db.syncQueue.update(id, {
      status: "failed",
    });
  });
};

// =====================================
// RESET FAILED OR PROCESSING CHANGES
// =====================================

export const resetPendingChanges = async (): Promise<void> => {
  await withDatabaseLease(async () => {
    await db.syncQueue
      .where("status")
      .anyOf(["failed", "processing"])
      .modify({
        status: "pending",
      });
  });
};

// =====================================
// REMOVE SUCCESSFULLY SYNCED CHANGE
// =====================================

export const removeSyncChange = async (
  id: number,
): Promise<void> => {
  await withDatabaseLease(async () => {
    await db.syncQueue.delete(id);
  });
};

// =====================================
// CLEAR COMPLETED SYNC QUEUE
// =====================================

export const clearSyncQueue = async (): Promise<void> => {
  await withDatabaseLease(async () => {
    await db.syncQueue.clear();
  });
};

// =====================================
// SAVE SYNC CURSOR
// =====================================

export const saveSyncCursor = async (
  cursor: string,
): Promise<void> => {
  if (!/^[a-fA-F0-9]{24}$/.test(cursor)) {
    throw new Error("Invalid synchronization cursor.");
  }

  await withDatabaseLease(async () => {
    await db.syncMeta.put({
      key: "lastSyncCursor",
      value: cursor,
    });
  });
};

// =====================================
// GET SAVED SYNC CURSOR
// =====================================

export const getSyncCursor = async (): Promise<string | null> => {
  return withDatabaseLease(async () => {
    const metadata = await db.syncMeta.get("lastSyncCursor");

    return metadata?.value ?? null;
  });
};

// =====================================
// CLEAR SYNC CURSOR
// =====================================

export const clearSyncCursor = async (): Promise<void> => {
  await withDatabaseLease(async () => {
    await db.syncMeta.delete("lastSyncCursor");
  });
};