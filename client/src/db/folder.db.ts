import { db, type LocalFolder, type LocalSyncChange } from "./database";

// =====================================
// GENERATE MONGODB-COMPATIBLE ID
// =====================================

const generateId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const validateFolderId = (id: string): void => {
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new Error("Invalid folder ID.");
  }
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
// GET QUEUED CHANGES FOR A FOLDER
// =====================================

const getFolderChanges = async (
  folderId: string,
): Promise<LocalSyncChange[]> => {
  const changes = await db.syncQueue
    .where("[entityType+entityId]")
    .equals(["folder", folderId])
    .toArray();

  return changes;
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

  if (name.trim().length > 50) {
    throw new Error("Folder name cannot exceed 50 characters");
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new Error("Color must be a valid six-digit hexadecimal color");
  }

  const now = new Date().toISOString();

  const folder: LocalFolder = {
    id: generateId(),
    name: name.trim(),
    color,
    version: 1,
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
  validateFolderId(id);
  return db.folders.get(id);
};

// =====================================
// UPDATE FOLDER LOCALLY
// =====================================

export const updateLocalFolder = async (
  id: string,
  updates: Partial<Pick<LocalFolder, "name" | "color">>,
): Promise<LocalFolder> => {
  validateFolderId(id);
  return db.transaction("rw", db.folders, db.syncQueue, async () => {
    const existingFolder = await db.folders.get(id);

    if (!existingFolder) {
      throw new Error("Folder not found");
    }

    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        throw new Error("Folder name is required");
      }

      if (updates.name.trim().length > 50) {
        throw new Error("Folder name cannot exceed 50 characters");
      }
    }

    if (
      updates.color !== undefined &&
      !/^#[0-9A-Fa-f]{6}$/.test(updates.color)
    ) {
      throw new Error("Color must be a valid six-digit hexadecimal color");
    }

    const now = new Date().toISOString();

    const updatedFolder: LocalFolder = {
      ...existingFolder,
      ...updates,
      name:
        updates.name !== undefined ? updates.name.trim() : existingFolder.name,
      updatedAt: now,
      syncStatus: "pending",
    };

    const changes = await getFolderChanges(id);

    const pendingCreate = changes.find(
      (change) =>
        change.operation === "create" && change.status !== "processing",
    );

    const pendingUpdate = changes.find(
      (change) =>
        change.operation === "update" && change.status !== "processing",
    );

    const updateData = {
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.color !== undefined ? { color: updates.color } : {}),
    };

    // If creation has not started syncing, merge edits into creation.
    if (pendingCreate && pendingCreate.id !== undefined) {
      await db.syncQueue.update(pendingCreate.id, {
        data: {
          ...(pendingCreate.data ?? {}),
          ...updateData,
        },
        status: "pending",
      });
    } else if (pendingUpdate && pendingUpdate.id !== undefined) {
      // Merge into an existing pending update.
      await db.syncQueue.update(pendingUpdate.id, {
        data: {
          ...(pendingUpdate.data ?? {}),
          ...updateData,
        },
        status: "pending",
      });
    } else {
      // Create a new version-checked update.
      const change: Omit<LocalSyncChange, "id"> = {
        entityType: "folder",
        entityId: id,
        operation: "update",
        clientMutationId: crypto.randomUUID(),
        expectedVersion: existingFolder.version,
        data: updateData,
        createdAt: now,
        status: "pending",
      };

      await addToSyncQueue(change);
    }

    await db.folders.put(updatedFolder);

    return updatedFolder;
  });
};

// =====================================
// DELETE FOLDER LOCALLY
// =====================================

export const deleteLocalFolder = async (id: string): Promise<void> => {
  validateFolderId(id);
  await db.transaction("rw", db.folders, db.syncQueue, async () => {
    const existingFolder = await db.folders.get(id);

    if (!existingFolder) {
      throw new Error("Folder not found");
    }

    const changes = await getFolderChanges(id);

    const pendingCreate = changes.find(
      (change) =>
        change.operation === "create" && change.status !== "processing",
    );

    // If creation has not started syncing, cancel it entirely.
    if (pendingCreate) {
      const removableChanges = changes
        .filter((change) => change.status !== "processing")
        .map((change) => change.id)
        .filter((changeId): changeId is number => changeId !== undefined);

      if (removableChanges.length > 0) {
        await db.syncQueue.bulkDelete(removableChanges);
      }

      await db.folders.delete(id);
      return;
    }

    // Remove pending updates because deletion replaces them.
    const pendingChanges = changes
      .filter(
        (change) =>
          change.status !== "processing" && change.operation !== "create",
      )
      .map((change) => change.id)
      .filter((changeId): changeId is number => changeId !== undefined);

    if (pendingChanges.length > 0) {
      await db.syncQueue.bulkDelete(pendingChanges);
    }

    const now = new Date().toISOString();

    const change: Omit<LocalSyncChange, "id"> = {
      entityType: "folder",
      entityId: id,
      operation: "delete",
      clientMutationId: crypto.randomUUID(),
      expectedVersion: existingFolder.version,
      data: undefined,
      createdAt: now,
      status: "pending",
    };

    await addToSyncQueue(change);
    await db.folders.delete(id);
  });
};
