import {
  db,
  type LocalNote,
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
// CREATE NOTE LOCALLY
// =====================================

export const createLocalNote = async (
  title: string,
  content: string = "",
  folderId: string | null = null,
): Promise<LocalNote> => {
  if (!title.trim()) {
    throw new Error("Note title is required");
  }

  const now = new Date().toISOString();

  const note: LocalNote = {
    id: generateId(),
    title: title.trim(),
    content,
    folderId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  const change: Omit<LocalSyncChange, "id"> = {
    entityType: "note",
    entityId: note.id,
    operation: "create",
    clientMutationId: crypto.randomUUID(),
    data: {
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      version: note.version,
    },
    createdAt: now,
    status: "pending",
  };

  await db.transaction("rw", db.notes, db.syncQueue, async () => {
    await db.notes.add(note);
    await db.syncQueue.add(change);
  });

  return note;
};

// =====================================
// GET ALL LOCAL NOTES
// =====================================

export const getLocalNotes = async (): Promise<LocalNote[]> => {
  return db.notes.orderBy("updatedAt").reverse().toArray();
};

// =====================================
// GET SINGLE LOCAL NOTE
// =====================================

export const getLocalNoteById = async (
  id: string,
): Promise<LocalNote | undefined> => {
  return db.notes.get(id);
};

// =====================================
// UPDATE NOTE LOCALLY
// =====================================

export const updateLocalNote = async (
  id: string,
  updates: Partial<Pick<LocalNote, "title" | "content" | "folderId">>,
): Promise<LocalNote> => {
  return db.transaction("rw", db.notes, db.syncQueue, async () => {
    const existingNote = await db.notes.get(id);

    if (!existingNote) {
      throw new Error("Note not found");
    }

    if (updates.title !== undefined && !updates.title.trim()) {
      throw new Error("Note title is required");
    }

    const now = new Date().toISOString();

    const updatedNote: LocalNote = {
      ...existingNote,
      ...updates,
      title:
        updates.title !== undefined
          ? updates.title.trim()
          : existingNote.title,
      updatedAt: now,
      syncStatus: "pending",
    };

    const queuedChanges = await db.syncQueue
      .where("[entityType+entityId]")
      .equals(["note", id])
      .toArray();

    const pendingCreate = queuedChanges.find(
      (change) =>
        change.operation === "create" &&
        change.status !== "processing",
    );

    const pendingUpdate = queuedChanges.find(
      (change) =>
        change.operation === "update" &&
        change.status !== "processing",
    );

    const updateData: Record<string, unknown> = {
      ...updates,
      ...(updates.title !== undefined
        ? { title: updates.title.trim() }
        : {}),
    };

    if (pendingCreate) {
      // The note has not reached the server yet.
      // Merge edits directly into its create operation.
      await db.syncQueue.update(pendingCreate.id!, {
        data: {
          ...(pendingCreate.data ?? {}),
          ...updateData,
        },
      });
    } else if (pendingUpdate) {
      // Combine multiple pending edits into one update.
      await db.syncQueue.update(pendingUpdate.id!, {
        data: {
          ...(pendingUpdate.data ?? {}),
          ...updateData,
        },
        createdAt: now,
      });
    } else {
      const change: Omit<LocalSyncChange, "id"> = {
        entityType: "note",
        entityId: id,
        operation: "update",
        clientMutationId: crypto.randomUUID(),
        expectedVersion: existingNote.version,
        data: updateData,
        createdAt: now,
        status: "pending",
      };

      await db.syncQueue.add(change);
    }

    await db.notes.put(updatedNote);

    return updatedNote;
  });
};

// =====================================
// DELETE NOTE LOCALLY
// =====================================

export const deleteLocalNote = async (id: string): Promise<void> => {
  await db.transaction("rw", db.notes, db.syncQueue, async () => {
    const existingNote = await db.notes.get(id);

    if (!existingNote) {
      throw new Error("Note not found");
    }

    const queuedChanges = await db.syncQueue
      .where("[entityType+entityId]")
      .equals(["note", id])
      .toArray();

    const pendingCreate = queuedChanges.find(
      (change) =>
        change.operation === "create" &&
        change.status !== "processing",
    );

    // If the note was never synced, remove it and its queued changes.
    if (pendingCreate) {
      await db.syncQueue.bulkDelete(
        queuedChanges
          .filter((change) => change.status !== "processing")
          .map((change) => change.id!),
      );

      await db.notes.delete(id);
      return;
    }

    const now = new Date().toISOString();

    // Remove pending updates. The delete supersedes them.
    await db.syncQueue.bulkDelete(
      queuedChanges
        .filter(
          (change) =>
            change.operation === "update" &&
            change.status !== "processing",
        )
        .map((change) => change.id!),
    );

    const change: Omit<LocalSyncChange, "id"> = {
      entityType: "note",
      entityId: id,
      operation: "delete",
      clientMutationId: crypto.randomUUID(),
      expectedVersion: existingNote.version,
      createdAt: now,
      status: "pending",
    };

    await db.notes.delete(id);
    await db.syncQueue.add(change);
  });
};