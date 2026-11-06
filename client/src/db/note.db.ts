import { db,type  LocalNote,type LocalSyncChange } from "./database";

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
    },
    createdAt: now,
    status: "pending",
  };

  await db.transaction("rw", db.notes, db.syncQueue, async () => {
    await db.notes.add(note);
    await addToSyncQueue(change);
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
      updates.title !== undefined ? updates.title.trim() : existingNote.title,
    updatedAt: now,
    syncStatus: "pending",
  };

  const change: Omit<LocalSyncChange, "id"> = {
    entityType: "note",
    entityId: id,
    operation: "update",
    clientMutationId: crypto.randomUUID(),
    data: {
      ...updates,
      ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    },
    createdAt: now,
    status: "pending",
  };

  await db.transaction("rw", db.notes, db.syncQueue, async () => {
    await db.notes.put(updatedNote);
    await addToSyncQueue(change);
  });

  return updatedNote;
};

// =====================================
// DELETE NOTE LOCALLY
// =====================================

export const deleteLocalNote = async (id: string): Promise<void> => {
  const existingNote = await db.notes.get(id);

  if (!existingNote) {
    throw new Error("Note not found");
  }

  const now = new Date().toISOString();

  const change: Omit<LocalSyncChange, "id"> = {
    entityType: "note",
    entityId: id,
    operation: "delete",
    clientMutationId: crypto.randomUUID(),
    data: undefined,
    createdAt: now,
    status: "pending",
  };

  await db.transaction("rw", db.notes, db.syncQueue, async () => {
    await db.notes.delete(id);
    await addToSyncQueue(change);
  });
};
