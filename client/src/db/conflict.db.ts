import {
  db,
  withDatabaseLease,
  type LocalConflict,
  type LocalNote,
  type LocalFolder,
  type LocalSyncChange,
} from "./database";

// =====================================
// GET ALL LOCAL CONFLICTS
// =====================================

export const getLocalConflicts = async (): Promise<LocalConflict[]> => {
  return withDatabaseLease(async () => {
    return db.conflicts.orderBy("detectedAt").reverse().toArray();
  });
};

export const getLocalConflictById = async (
  id: string,
): Promise<LocalConflict | undefined> => {
  return withDatabaseLease(async () => {
    return db.conflicts.get(id);
  });
};

// =====================================
// GET SERVER VERSION
// =====================================

const getServerVersion = (
  serverData: Record<string, unknown> | null,
): number => {
  const version = serverData?.version;

  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    throw new Error("Valid server version is missing from the conflict.");
  }

  return version;
};

// =====================================
// GENERATE SYNC CHANGE
// =====================================

const createSyncChange = (
  entityType: "note" | "folder",
  entityId: string,
  operation: "create" | "update" | "delete",
  data?: Record<string, unknown>,
  expectedVersion?: number,
): Omit<LocalSyncChange, "id"> => {
  return {
    entityType,
    entityId,
    operation,
    clientMutationId: crypto.randomUUID(),
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    ...(data !== undefined ? { data } : {}),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
};

// =====================================
// KEEP MY LOCAL VERSION
// =====================================

export const keepLocalVersion = async (conflictId: string): Promise<void> => {
  await withDatabaseLease(async () => {
    await db.transaction(
      "rw",
      db.notes,
      db.folders,
      db.syncQueue,
      db.conflicts,
      async () => {
        const conflict = await db.conflicts.get(conflictId);

        if (!conflict) {
          throw new Error("Conflict not found");
        }

        const {
          entityType,
          entityId,
          localData,
          operation: serverOperation,
          serverData,
        } = conflict;

        // Remove previous queued operations.
        await db.syncQueue
          .where("[entityType+entityId]")
          .equals([entityType, entityId])
          .delete();

        // =================================
        // NOTE
        // =================================

        if (entityType === "note") {
          if (localData) {
            const note = localData as unknown as LocalNote;
            if (
              note.id !== entityId ||
              typeof note.title !== "string" ||
              typeof note.content !== "string" ||
              (note.folderId !== null && typeof note.folderId !== "string")
            ) {
              throw new Error("Invalid local note conflict data.");
            }

            if (serverOperation === "delete") {
              const recreatedNote: LocalNote = {
                ...note,
                version: 1,
                syncStatus: "pending",
              };

              await db.notes.put(recreatedNote);

              await db.syncQueue.add(
                createSyncChange("note", entityId, "create", {
                  title: note.title,
                  content: note.content,
                  folderId: note.folderId,
                  version: 1,
                }),
              );
            } else {
              const serverVersion = getServerVersion(serverData);

              await db.notes.put({
                ...note,
                version: serverVersion,
                syncStatus: "pending",
              });

              await db.syncQueue.add(
                createSyncChange(
                  "note",
                  entityId,
                  "update",
                  {
                    title: note.title,
                    content: note.content,
                    folderId: note.folderId,
                  },
                  serverVersion,
                ),
              );
            }
          } else {
            // Local version represents a deletion.
            await db.notes.delete(entityId);

            if (serverOperation !== "delete") {
              const serverVersion = getServerVersion(serverData);

              await db.syncQueue.add(
                createSyncChange(
                  "note",
                  entityId,
                  "delete",
                  undefined,
                  serverVersion,
                ),
              );
            }
          }
        }

        // =================================
        // FOLDER
        // =================================

        if (entityType === "folder") {
          if (localData) {
            const folder = localData as unknown as LocalFolder;

            if (
              folder.id !== entityId ||
              typeof folder.name !== "string" ||
              typeof folder.color !== "string"
            ) {
              throw new Error("Invalid local folder conflict data.");
            }

            if (serverOperation === "delete") {
              const recreatedFolder: LocalFolder = {
                ...folder,
                version: 1,
                syncStatus: "pending",
              };

              await db.folders.put(recreatedFolder);

              await db.syncQueue.add(
                createSyncChange("folder", entityId, "create", {
                  name: folder.name,
                  color: folder.color,
                  version: 1,
                }),
              );
            } else {
              const serverVersion = getServerVersion(serverData);

              await db.folders.put({
                ...folder,
                version: serverVersion,
                syncStatus: "pending",
              });

              await db.syncQueue.add(
                createSyncChange(
                  "folder",
                  entityId,
                  "update",
                  {
                    name: folder.name,
                    color: folder.color,
                  },
                  serverVersion,
                ),
              );
            }
          } else {
            await db.folders.delete(entityId);

            if (serverOperation !== "delete") {
              const serverVersion = getServerVersion(serverData);

              await db.syncQueue.add(
                createSyncChange(
                  "folder",
                  entityId,
                  "delete",
                  undefined,
                  serverVersion,
                ),
              );
            }
          }
        }

        // Remove resolved conflict.
        await db.conflicts.delete(conflictId);
      },
    );
  });
};

// =====================================
// USE SERVER VERSION
// =====================================
export const useServerVersion = async (conflictId: string): Promise<void> => {
  await withDatabaseLease(async () => {
    await db.transaction(
      "rw",
      db.notes,
      db.folders,
      db.syncQueue,
      db.conflicts,
      async () => {
        const conflict = await db.conflicts.get(conflictId);

        if (!conflict) {
          throw new Error("Conflict not found");
        }

        const { entityType, entityId, serverData, operation } = conflict;

        // Remove all queued local operations.
        await db.syncQueue
          .where("[entityType+entityId]")
          .equals([entityType, entityId])
          .delete();

        // =================================
        // NOTE
        // =================================

        if (entityType === "note") {
          if (operation === "delete") {
            await db.notes.delete(entityId);
          } else {
            if (!serverData) {
              throw new Error("Server note data is missing");
            }

            const existingNote = await db.notes.get(entityId);

            const note: LocalNote = {
              id: entityId,

              title:
                typeof serverData.title === "string"
                  ? serverData.title
                  : "Untitled",

              content:
                typeof serverData.content === "string"
                  ? serverData.content
                  : "",

              folderId:
                serverData.folderId === null
                  ? null
                  : typeof serverData.folderId === "string"
                    ? serverData.folderId
                    : null,

              version: getServerVersion(serverData),

              createdAt:
                typeof serverData.createdAt === "string"
                  ? serverData.createdAt
                  : (existingNote?.createdAt ?? conflict.detectedAt),

              updatedAt:
                typeof serverData.updatedAt === "string"
                  ? serverData.updatedAt
                  : conflict.detectedAt,

              syncStatus: "synced",
            };

            await db.notes.put(note);
          }
        }

        // =================================
        // FOLDER
        // =================================

        if (entityType === "folder") {
          if (operation === "delete") {
            await db.folders.delete(entityId);
          } else {
            if (!serverData) {
              throw new Error("Server folder data is missing");
            }

            const existingFolder = await db.folders.get(entityId);

            const folder: LocalFolder = {
              id: entityId,

              name:
                typeof serverData.name === "string"
                  ? serverData.name
                  : "Untitled folder",

              color:
                typeof serverData.color === "string"
                  ? serverData.color
                  : "#F47768",

              version: getServerVersion(serverData),

              createdAt:
                typeof serverData.createdAt === "string"
                  ? serverData.createdAt
                  : (existingFolder?.createdAt ?? conflict.detectedAt),

              updatedAt:
                typeof serverData.updatedAt === "string"
                  ? serverData.updatedAt
                  : conflict.detectedAt,

              syncStatus: "synced",
            };

            await db.folders.put(folder);
          }
        }

        // Remove resolved conflict.
        await db.conflicts.delete(conflictId);
      },
    );
  });
};
