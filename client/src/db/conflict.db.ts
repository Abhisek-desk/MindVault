import {
  db,
  type LocalConflict,
  type LocalNote,
  type LocalFolder,
  type LocalSyncChange,
} from "./database";

// =====================================
// GET ALL LOCAL CONFLICTS
// =====================================

export const getLocalConflicts = async (): Promise<LocalConflict[]> => {
  return db.conflicts
    .orderBy("detectedAt")
    .reverse()
    .toArray();
};

// =====================================
// GET SINGLE CONFLICT
// =====================================

export const getLocalConflictById = async (
  id: string
): Promise<LocalConflict | undefined> => {
  return db.conflicts.get(id);
};

// =====================================
// GENERATE SYNC CHANGE
// =====================================

const createSyncChange = (
  entityType: "note" | "folder",
  entityId: string,
  operation: "create" | "update" | "delete",
  data?: Record<string, unknown>
): Omit<LocalSyncChange, "id"> => {
  return {
    entityType,
    entityId,
    operation,
    clientMutationId: crypto.randomUUID(),
    ...(data !== undefined ? { data } : {}),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
};

// =====================================
// KEEP MY LOCAL VERSION
// =====================================

export const keepLocalVersion = async (
  conflictId: string
): Promise<void> => {
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

      const { entityType, entityId, localData, operation: serverOperation } =
        conflict;

      // Remove previous queued operations for this entity.
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

          await db.notes.put({
            ...note,
            syncStatus: "pending",
          });

          // If the server deleted the note, recreate it.
          // Otherwise, update the existing server note.
          const operation =
            serverOperation === "delete" ? "create" : "update";

          await db.syncQueue.add(
            createSyncChange("note", entityId, operation, {
              title: note.title,
              content: note.content,
              folderId: note.folderId,
            })
          );
        } else {
          // The local version represents a deletion.
          await db.notes.delete(entityId);

          await db.syncQueue.add(
            createSyncChange("note", entityId, "delete")
          );
        }
      }

      // =================================
      // FOLDER
      // =================================

      if (entityType === "folder") {
        if (localData) {
          const folder = localData as unknown as LocalFolder;

          await db.folders.put({
            ...folder,
            syncStatus: "pending",
          });

          const operation =
            serverOperation === "delete" ? "create" : "update";

          await db.syncQueue.add(
            createSyncChange("folder", entityId, operation, {
              name: folder.name,
              color: folder.color,
            })
          );
        } else {
          await db.folders.delete(entityId);

          await db.syncQueue.add(
            createSyncChange("folder", entityId, "delete")
          );
        }
      }

      // Remove resolved conflict.
      await db.conflicts.delete(conflictId);
    }
  );
};

// =====================================
// USE SERVER VERSION
// =====================================

export const useServerVersion = async (
  conflictId: string
): Promise<void> => {
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
        serverData,
        operation,
      } = conflict;

      // Remove all pending local operations.
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

            createdAt:
              existingNote?.createdAt ??
              conflict.detectedAt,

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

            createdAt:
              existingFolder?.createdAt ??
              conflict.detectedAt,

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
    }
  );
};