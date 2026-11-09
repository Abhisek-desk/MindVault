import "fake-indexeddb/auto";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "./database";
import {
  createLocalNote,
  updateLocalNote,
  deleteLocalNote,
} from "./note.db";
import {
  createLocalFolder,
  updateLocalFolder,
  deleteLocalFolder,
} from "./folder.db";
import {
  getPendingChanges,
  resetPendingChanges,
  saveSyncCursor,
  getSyncCursor,
} from "./sync.db";

// =====================================
// DATABASE TEST SETUP
// =====================================

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();
});

// =====================================
// NOTE TESTS
// =====================================

describe("Offline note operations", () => {
  it("creates a note and queues a sync change", async () => {
    const note = await createLocalNote(
      "Test Note",
      "Testing offline notes",
    );

    const savedNote = await db.notes.get(note.id);
    const changes = await getPendingChanges();

    expect(savedNote).toBeDefined();
    expect(savedNote?.title).toBe("Test Note");
    expect(savedNote?.version).toBe(1);
    expect(savedNote?.syncStatus).toBe("pending");

    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("create");
    expect(changes[0].entityType).toBe("note");
  });

  it("rejects an empty note title", async () => {
    await expect(
      createLocalNote("   "),
    ).rejects.toThrow("Note title is required");

    expect(await db.notes.count()).toBe(0);
  });

  it("merges multiple edits into a pending note creation", async () => {
    const note = await createLocalNote(
      "Original",
      "Original content",
    );

    await updateLocalNote(note.id, {
      title: "Updated",
    });

    await updateLocalNote(note.id, {
      content: "Updated content",
    });

    const changes = await getPendingChanges();
    const savedNote = await db.notes.get(note.id);

    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("create");
    expect(changes[0].data?.title).toBe("Updated");
    expect(changes[0].data?.content).toBe("Updated content");

    expect(savedNote?.title).toBe("Updated");
    expect(savedNote?.content).toBe("Updated content");
  });

  it("queues an update with the expected version", async () => {
    const note = await createLocalNote(
      "Synced Note",
      "Original content",
    );

    await db.syncQueue.clear();

    await db.notes.update(note.id, {
      syncStatus: "synced",
      version: 5,
    });

    await updateLocalNote(note.id, {
      title: "Updated Synced Note",
    });

    const changes = await getPendingChanges();

    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("update");
    expect(changes[0].expectedVersion).toBe(5);
  });

  it("cancels an unsynced note creation when deleted", async () => {
    const note = await createLocalNote(
      "Temporary Note",
    );

    await deleteLocalNote(note.id);

    expect(await db.notes.get(note.id)).toBeUndefined();
    expect(await db.syncQueue.count()).toBe(0);
  });

  it("queues deletion of an existing synced note", async () => {
    const note = await createLocalNote(
      "Existing Note",
    );

    await db.syncQueue.clear();

    await db.notes.update(note.id, {
      version: 3,
      syncStatus: "synced",
    });

    await deleteLocalNote(note.id);

    const changes = await getPendingChanges();

    expect(await db.notes.get(note.id)).toBeUndefined();
    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("delete");
    expect(changes[0].expectedVersion).toBe(3);
  });
});

// =====================================
// FOLDER TESTS
// =====================================

describe("Offline folder operations", () => {
  it("creates a folder with version 1", async () => {
    const folder = await createLocalFolder(
      "Programming",
    );

    const savedFolder = await db.folders.get(folder.id);
    const changes = await getPendingChanges();

    expect(savedFolder?.name).toBe("Programming");
    expect(savedFolder?.version).toBe(1);
    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("create");
    expect(changes[0].entityType).toBe("folder");
  });

  it("rejects an empty folder name", async () => {
    await expect(
      createLocalFolder("   "),
    ).rejects.toThrow("Folder name is required");

    expect(await db.folders.count()).toBe(0);
  });

  it("merges edits into a pending folder creation", async () => {
    const folder = await createLocalFolder(
      "Original Folder",
    );

    await updateLocalFolder(folder.id, {
      name: "Updated Folder",
    });

    const changes = await getPendingChanges();

    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("create");
    expect(changes[0].data?.name).toBe("Updated Folder");

    const savedFolder = await db.folders.get(folder.id);

    expect(savedFolder?.name).toBe("Updated Folder");
  });

  it("queues a folder update with its expected version", async () => {
    const folder = await createLocalFolder(
      "Existing Folder",
    );

    await db.syncQueue.clear();

    await db.folders.update(folder.id, {
      version: 4,
      syncStatus: "synced",
    });

    await updateLocalFolder(folder.id, {
      name: "Renamed Folder",
    });

    const changes = await getPendingChanges();

    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("update");
    expect(changes[0].expectedVersion).toBe(4);
  });

  it("cancels an unsynced folder creation when deleted", async () => {
    const folder = await createLocalFolder(
      "Temporary Folder",
    );

    await deleteLocalFolder(folder.id);

    expect(
      await db.folders.get(folder.id),
    ).toBeUndefined();

    expect(await db.syncQueue.count()).toBe(0);
  });

  it("queues deletion of an existing synced folder", async () => {
    const folder = await createLocalFolder(
      "Existing Folder",
    );

    await db.syncQueue.clear();

    await db.folders.update(folder.id, {
      version: 6,
      syncStatus: "synced",
    });

    await deleteLocalFolder(folder.id);

    const changes = await getPendingChanges();

    expect(
      await db.folders.get(folder.id),
    ).toBeUndefined();

    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("delete");
    expect(changes[0].expectedVersion).toBe(6);
  });
});

// =====================================
// SYNC QUEUE TESTS
// =====================================

describe("Offline synchronization queue", () => {
  it("resets failed and processing changes to pending", async () => {
    const note = await createLocalNote("Queue Test");

    const changes = await getPendingChanges();

    await db.syncQueue.update(changes[0].id!, {
      status: "processing",
    });

    await db.syncQueue.update(changes[0].id!, {
      status: "failed",
    });

    await resetPendingChanges();

    const updatedChanges = await getPendingChanges();

    expect(updatedChanges).toHaveLength(1);
    expect(updatedChanges[0].status).toBe("pending");
    expect(updatedChanges[0].entityId).toBe(note.id);
  });

  it("saves and retrieves the synchronization cursor", async () => {
    const cursor = "507f1f77bcf86cd799439011";

    await saveSyncCursor(cursor);

    expect(await getSyncCursor()).toBe(cursor);
  });
});