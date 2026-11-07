import {
  db,
  type LocalFolder,
  type LocalSyncChange,
} from "./database";

// =====================================
// GENERATE MONGODB-COMPATIBLE ID
// =====================================

const generateId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

// =====================================
// ADD CHANGE TO OFFLINE SYNC QUEUE
// =====================================

const addToSyncQueue = async (
  change: Omit<LocalSyncChange, "id">,
): Promise<void> => {
  await db.syncQueue.add(change);
};

// =====================================
// CREATE FOLDER LOCALLY
// =====================================

export const createLocalFolder = async (
  name: string,
  color: string = "#F47768",
): Promise<LocalFolder> => {
  if (!name.trim()) {
    throw new Error("Folder name is required");
  }

  const now = new Date().toISOString();

  const folder: LocalFolder = {
    id: generateId(),
    name: name.trim(),
    color,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  const change: Omit<LocalSyncChange, "id"> = {
    entityType: "folder",
    entityId: folder.id,
    operation: "create",
    clientMutationId: crypto.randomUUID(),
    data: {
      name: folder.name,
      color: folder.color,
    },
    createdAt: now,
    status: "pending",
  };

  await db.transaction("rw", db.folders, db.syncQueue, async () => {
    await db.folders.add(folder);
    await addToSyncQueue(change);
  });

  return folder;
};

// =====================================
// GET ALL LOCAL FOLDERS
// =====================================

export const getLocalFolders = async (): Promise<LocalFolder[]> => {
  return db.folders.orderBy("updatedAt").reverse().toArray();
};

// =====================================
// GET SINGLE LOCAL FOLDER
// =====================================

export const getLocalFolderById = async (
  id: string,
): Promise<LocalFolder | undefined> => {
  return db.folders.get(id);
};

// =====================================
// UPDATE FOLDER LOCALLY
// =====================================

export const updateLocalFolder = async (
  id: string,
  updates: Partial<Pick<LocalFolder, "name" | "color">>,
): Promise<LocalFolder> => {
  const existingFolder = await db.folders.get(id);

  if (!existingFolder) {
    throw new Error("Folder not found");
  }

  if (updates.name !== undefined && !updates.name.trim()) {
    throw new Error("Folder name is required");
  }

  const now = new Date().toISOString();

  const updatedFolder: LocalFolder = {
    ...existingFolder,
    ...updates,
    name:
      updates.name !== undefined
        ? updates.name.trim()
        : existingFolder.name,
    updatedAt: now,
    syncStatus: "pending",
  };

  const change: Omit<LocalSyncChange, "id"> = {
    entityType: "folder",
    entityId: id,
    operation: "update",
    clientMutationId: crypto.randomUUID(),
    data: {
      ...updates,
      ...(updates.name !== undefined
        ? { name: updates.name.trim() }
        : {}),
    },
    createdAt: now,
    status: "pending",
  };

  await db.transaction("rw", db.folders, db.syncQueue, async () => {
    await db.folders.put(updatedFolder);
    await addToSyncQueue(change);
  });

  return updatedFolder;
};

// =====================================
// DELETE FOLDER LOCALLY
// =====================================

export const deleteLocalFolder = async (
  id: string,
): Promise<void> => {
  const existingFolder = await db.folders.get(id);

  if (!existingFolder) {
    throw new Error("Folder not found");
  }

  const now = new Date().toISOString();

  const change: Omit<LocalSyncChange, "id"> = {
    entityType: "folder",
    entityId: id,
    operation: "delete",
    clientMutationId: crypto.randomUUID(),
    data: undefined,
    createdAt: now,
    status: "pending",
  };

  await db.transaction("rw", db.folders, db.syncQueue, async () => {
    await db.folders.delete(id);
    await addToSyncQueue(change);
  });
};