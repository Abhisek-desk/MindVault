import { db,  type LocalSyncChange} from "./database";

// =====================================
// GET PENDING SYNC CHANGES
// =====================================

export const getPendingChanges = async (): Promise<LocalSyncChange[]> => {
  return db.syncQueue
    .where("status")
    .equals("pending")
    .sortBy("createdAt");
};

// =====================================
// GET ALL QUEUED CHANGES
// =====================================

export const getAllSyncChanges = async (): Promise<LocalSyncChange[]> => {
  return db.syncQueue
    .orderBy("createdAt")
    .toArray();
};

// =====================================
// MARK CHANGE AS PROCESSING
// =====================================

export const markChangeAsProcessing = async (
  id: number
): Promise<void> => {
  await db.syncQueue.update(id, {
    status: "processing"
  });
};

// =====================================
// MARK CHANGE AS FAILED
// =====================================

export const markChangeAsFailed = async (
  id: number
): Promise<void> => {
  await db.syncQueue.update(id, {
    status: "failed"
  });
};

// =====================================
// RESET FAILED OR PROCESSING CHANGES
// =====================================

export const resetPendingChanges = async (): Promise<void> => {
  await db.syncQueue
    .where("status")
    .anyOf(["failed", "processing"])
    .modify({
      status: "pending"
    });
};

// =====================================
// REMOVE SUCCESSFULLY SYNCED CHANGE
// =====================================

export const removeSyncChange = async (
  id: number
): Promise<void> => {
  await db.syncQueue.delete(id);
};

// =====================================
// CLEAR COMPLETED SYNC QUEUE
// =====================================

export const clearSyncQueue = async (): Promise<void> => {
  await db.syncQueue.clear();
};

// =====================================
// SAVE SYNC CURSOR
// =====================================

export const saveSyncCursor = async (
  cursor: string
): Promise<void> => {
  if (!/^[a-fA-F0-9]{24}$/.test(cursor)) {
    throw new Error("Invalid synchronization cursor.");
  }

  await db.syncMeta.put({
    key: "lastSyncCursor",
    value: cursor
  });
};

// =====================================
// GET SAVED SYNC CURSOR
// =====================================

export const getSyncCursor = async (): Promise<string | null> => {
  const metadata = await db.syncMeta.get("lastSyncCursor");

  return metadata?.value ?? null;
};

// =====================================
// CLEAR SYNC CURSOR
// =====================================

export const clearSyncCursor = async (): Promise<void> => {
  await db.syncMeta.delete("lastSyncCursor");
};