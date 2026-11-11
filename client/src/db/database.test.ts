import "fake-indexeddb/auto";

import Dexie from "dexie";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  db,
  initializeUserDatabase,
  acquireDatabaseLease,
  getActiveDatabaseUserId,
} from "./database";

import { createLocalNote, updateLocalNote, deleteLocalNote } from "./note.db";

import {
  createLocalFolder,
  updateLocalFolder,
  deleteLocalFolder,
  deleteLocalFolderAndUnassignNotes,
} from "./folder.db";

import {
  getPendingChanges,
  resetPendingChanges,
  saveSyncCursor,
  getSyncCursor,
} from "./sync.db";

// =====================================
// TEST ACCOUNT IDS
// =====================================

const accountA = "507f1f77bcf86cd799439011";
const accountB = "507f191e810c19729de860ea";

// =====================================
// DATABASE TEST SETUP
// =====================================

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();

  await Dexie.delete(`MindVaultDatabase_${accountA}`);
  await Dexie.delete(`MindVaultDatabase_${accountB}`);
  await Dexie.delete("MindVaultDatabase_anonymous");
  await Dexie.delete("MindVaultDatabase");
});

// =====================================
// NOTE TESTS
// =====================================

describe("Offline note operations", () => {
  it("creates a note and queues a sync change", async () => {
    const note = await createLocalNote("Test Note", "Testing offline notes");

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
    await expect(createLocalNote("   ")).rejects.toThrow(
      "Note title is required",
    );

    expect(await db.notes.count()).toBe(0);
  });

  it("merges multiple edits into a pending note creation", async () => {
    const note = await createLocalNote("Original", "Original content");

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
    const note = await createLocalNote("Synced Note", "Original content");

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
    const note = await createLocalNote("Temporary Note");

    await deleteLocalNote(note.id);

    expect(await db.notes.get(note.id)).toBeUndefined();
    expect(await db.syncQueue.count()).toBe(0);
  });

  it("queues deletion of an existing synced note", async () => {
    const note = await createLocalNote("Existing Note");

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
    const folder = await createLocalFolder("Programming");

    const savedFolder = await db.folders.get(folder.id);
    const changes = await getPendingChanges();

    expect(savedFolder?.name).toBe("Programming");
    expect(savedFolder?.version).toBe(1);
    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("create");
    expect(changes[0].entityType).toBe("folder");
  });

  it("rejects an empty folder name", async () => {
    await expect(createLocalFolder("   ")).rejects.toThrow(
      "Folder name is required",
    );

    expect(await db.folders.count()).toBe(0);
  });

  it("merges edits into a pending folder creation", async () => {
    const folder = await createLocalFolder("Original Folder");

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
    const folder = await createLocalFolder("Existing Folder");

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
    const folder = await createLocalFolder("Temporary Folder");

    await deleteLocalFolder(folder.id);

    expect(await db.folders.get(folder.id)).toBeUndefined();

    expect(await db.syncQueue.count()).toBe(0);
  });

  it("queues deletion of an existing synced folder", async () => {
    const folder = await createLocalFolder("Existing Folder");

    await db.syncQueue.clear();

    await db.folders.update(folder.id, {
      version: 6,
      syncStatus: "synced",
    });

    await deleteLocalFolder(folder.id);

    const changes = await getPendingChanges();

    expect(await db.folders.get(folder.id)).toBeUndefined();

    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("delete");
    expect(changes[0].expectedVersion).toBe(6);
  });
  it("deletes a synced folder and moves all its notes to unfiled notes", async () => {
    const folder = await createLocalFolder("Programming");

    const noteA = await createLocalNote(
      "JavaScript",
      "JavaScript notes",
      folder.id,
    );

    const noteB = await createLocalNote("Python", "Python notes", folder.id);

    // Simulate notes and folder already synchronized.
    await db.syncQueue.clear();

    await db.folders.update(folder.id, {
      version: 3,
      syncStatus: "synced",
    });

    await db.notes.update(noteA.id, {
      version: 2,
      syncStatus: "synced",
    });

    await db.notes.update(noteB.id, {
      version: 4,
      syncStatus: "synced",
    });

    await deleteLocalFolderAndUnassignNotes(folder.id);

    const savedNoteA = await db.notes.get(noteA.id);
    const savedNoteB = await db.notes.get(noteB.id);
    const changes = await db.syncQueue.toArray();

    expect(await db.folders.get(folder.id)).toBeUndefined();

    expect(savedNoteA?.folderId).toBeNull();
    expect(savedNoteB?.folderId).toBeNull();

    expect(savedNoteA?.syncStatus).toBe("pending");
    expect(savedNoteB?.syncStatus).toBe("pending");

    expect(changes).toHaveLength(3);

    const noteChanges = changes.filter(
      (change) => change.entityType === "note",
    );

    const folderChanges = changes.filter(
      (change) => change.entityType === "folder",
    );

    expect(noteChanges).toHaveLength(2);
    expect(folderChanges).toHaveLength(1);

    expect(
      noteChanges.every(
        (change) =>
          change.operation === "update" && change.data?.folderId === null,
      ),
    ).toBe(true);

    expect(folderChanges[0].operation).toBe("delete");
    expect(folderChanges[0].expectedVersion).toBe(3);
  });
  it("removes an unsynced folder and preserves its notes as unfiled", async () => {
    const folder = await createLocalFolder("Temporary Folder");

    const note = await createLocalNote(
      "Temporary Note",
      "Note content",
      folder.id,
    );

    await deleteLocalFolderAndUnassignNotes(folder.id);

    const savedNote = await db.notes.get(note.id);
    const noteChanges = await db.syncQueue
      .where("[entityType+entityId]")
      .equals(["note", note.id])
      .toArray();

    expect(await db.folders.get(folder.id)).toBeUndefined();

    expect(savedNote?.folderId).toBeNull();

    // The original note creation should remain queued,
    // with its folder reference removed.
    expect(noteChanges).toHaveLength(1);
    expect(noteChanges[0].operation).toBe("create");
    expect(noteChanges[0].data?.folderId).toBeNull();

    expect(
      await db.syncQueue
        .where("[entityType+entityId]")
        .equals(["folder", folder.id])
        .count(),
    ).toBe(0);
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

// =====================================
// ACCOUNT DATABASE ISOLATION
// =====================================

describe("Account database isolation", () => {
  it("keeps local data separate between accounts", async () => {
    await initializeUserDatabase(accountA);

    await db.notes.put({
      id: "507f1f77bcf86cd799439012",
      title: "Account A Private Note",
      content: "This belongs to Account A.",
      folderId: null,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "synced",
    });

    await initializeUserDatabase(accountB);

    expect(await db.notes.count()).toBe(0);

    await db.notes.put({
      id: "507f1f77bcf86cd799439013",
      title: "Account B Private Note",
      content: "This belongs to Account B.",
      folderId: null,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "synced",
    });

    await initializeUserDatabase(accountA);

    expect(await db.notes.count()).toBe(1);

    expect(await db.notes.get("507f1f77bcf86cd799439012")).toBeDefined();

    expect(await db.notes.get("507f1f77bcf86cd799439013")).toBeUndefined();
  });

  it("reports the currently active account", async () => {
    await initializeUserDatabase(accountA);

    expect(getActiveDatabaseUserId()).toBe(accountA);

    await initializeUserDatabase(accountB);

    expect(getActiveDatabaseUserId()).toBe(accountB);
  });

  it("rejects invalid account IDs", async () => {
    await expect(initializeUserDatabase("invalid-user-id")).rejects.toThrow();
  });
});

// =====================================
// DATABASE LEASE TESTS
// =====================================

describe("Database leases", () => {
  it("allows a lease for the active account", async () => {
    await initializeUserDatabase(accountA);

    const releaseLease = acquireDatabaseLease(accountA);

    expect(typeof releaseLease).toBe("function");

    releaseLease();
  });

  it("rejects a lease for a different account", async () => {
    await initializeUserDatabase(accountA);

    expect(() => {
      acquireDatabaseLease(accountB);
    }).toThrow();
  });

  it("waits for an active lease before switching accounts", async () => {
    await initializeUserDatabase(accountA);

    const releaseLease = acquireDatabaseLease(accountA);

    let switchCompleted = false;

    const switchPromise = initializeUserDatabase(accountB).then(() => {
      switchCompleted = true;
    });

    // The switch must wait for the existing lease.
    expect(switchCompleted).toBe(false);

    releaseLease();

    await switchPromise;

    expect(switchCompleted).toBe(true);
    expect(getActiveDatabaseUserId()).toBe(accountB);
  });

  it("blocks new leases while an account switch is pending", async () => {
    await initializeUserDatabase(accountA);

    const releaseLease = acquireDatabaseLease(accountA);

    const switchPromise = initializeUserDatabase(accountB);

    expect(() => {
      acquireDatabaseLease(accountA);
    }).toThrow();

    releaseLease();

    await switchPromise;

    expect(getActiveDatabaseUserId()).toBe(accountB);
  });

  it("allows repeated lease release without corrupting the lease count", async () => {
    await initializeUserDatabase(accountA);

    const releaseLease = acquireDatabaseLease(accountA);

    releaseLease();
    releaseLease();

    await initializeUserDatabase(accountB);

    expect(getActiveDatabaseUserId()).toBe(accountB);
  });

  it("waits for all active leases before switching accounts", async () => {
    await initializeUserDatabase(accountA);

    const releaseFirst = acquireDatabaseLease(accountA);
    const releaseSecond = acquireDatabaseLease(accountA);

    let switchCompleted = false;

    const switchPromise = initializeUserDatabase(accountB).then(() => {
      switchCompleted = true;
    });

    releaseFirst();

    expect(switchCompleted).toBe(false);

    releaseSecond();

    await switchPromise;

    expect(switchCompleted).toBe(true);
    expect(getActiveDatabaseUserId()).toBe(accountB);
  });
});
