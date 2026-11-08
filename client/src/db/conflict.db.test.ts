import "fake-indexeddb/auto";

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { db } from "./database";
import { createLocalNote } from "./note.db";

import {
  keepLocalVersion,
  useServerVersion,
} from "./conflict.db";

// =====================================
// DATABASE SETUP
// =====================================

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();
});

// =====================================
// CONFLICT RESOLUTION TESTS
// =====================================

describe("Conflict resolution", () => {
  it("keeps the local version and queues an update", async () => {
    const note = await createLocalNote(
      "Local Version",
      "My local content",
    );

    await db.syncQueue.clear();

    await db.notes.update(note.id, {
      version: 1,
      syncStatus: "conflict",
    });

    await db.conflicts.put({
      id: `note:${note.id}`,
      entityType: "note",
      entityId: note.id,
      operation: "update",
      localData: {
        ...note,
        title: "Local Version",
      },
      serverData: {
        title: "Server Version",
        content: "Server content",
        folderId: null,
        version: 2,
      },
      serverChangeId: "server-change-001",
      detectedAt: new Date().toISOString(),
    });

    await keepLocalVersion(`note:${note.id}`);

    const savedNote = await db.notes.get(note.id);

    const changes = await db.syncQueue.toArray();

    expect(savedNote?.title).toBe("Local Version");
    expect(savedNote?.version).toBe(2);
    expect(savedNote?.syncStatus).toBe("pending");

    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("update");
    expect(changes[0].expectedVersion).toBe(2);

    expect(
      await db.conflicts.get(`note:${note.id}`),
    ).toBeUndefined();
  });

  it("accepts the server version and removes pending local changes", async () => {
    const note = await createLocalNote(
      "Old Local Version",
      "Old content",
    );

    await db.syncQueue.clear();

    await db.notes.update(note.id, {
      syncStatus: "conflict",
    });

    await db.syncQueue.add({
      entityType: "note",
      entityId: note.id,
      operation: "update",
      clientMutationId: crypto.randomUUID(),
      expectedVersion: 1,
      data: {
        title: "Old Local Version",
      },
      createdAt: new Date().toISOString(),
      status: "pending",
    });

    await db.conflicts.put({
      id: `note:${note.id}`,
      entityType: "note",
      entityId: note.id,
      operation: "update",
      localData: {
        ...note,
        title: "Old Local Version",
      },
      serverData: {
        title: "Server Version",
        content: "New server content",
        folderId: null,
        version: 3,
      },
      serverChangeId: "server-change-002",
      detectedAt: new Date().toISOString(),
    });

    await useServerVersion(`note:${note.id}`);

    const savedNote = await db.notes.get(note.id);

    expect(savedNote?.title).toBe("Server Version");
    expect(savedNote?.content).toBe("New server content");
    expect(savedNote?.version).toBe(3);
    expect(savedNote?.syncStatus).toBe("synced");

    expect(
      await db.syncQueue
        .where("[entityType+entityId]")
        .equals(["note", note.id])
        .count(),
    ).toBe(0);

    expect(
      await db.conflicts.get(`note:${note.id}`),
    ).toBeUndefined();
  });

  it("recreates a locally deleted note when keeping local after a server update", async () => {
    const note = await createLocalNote(
      "Deleted Local Note",
      "Local content",
    );

    await db.syncQueue.clear();

    await db.notes.delete(note.id);

    await db.conflicts.put({
      id: `note:${note.id}`,
      entityType: "note",
      entityId: note.id,
      operation: "update",
      localData: null,
      serverData: {
        title: "Server Note",
        content: "Server content",
        folderId: null,
        version: 4,
      },
      serverChangeId: "server-change-003",
      detectedAt: new Date().toISOString(),
    });

    await keepLocalVersion(`note:${note.id}`);

    const changes = await db.syncQueue.toArray();

    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe("delete");
    expect(changes[0].expectedVersion).toBe(4);

    expect(
      await db.notes.get(note.id),
    ).toBeUndefined();
  });

  it("rejects resolving a conflict that does not exist", async () => {
    await expect(
      keepLocalVersion("note:missing"),
    ).rejects.toThrow("Conflict not found");

    await expect(
      useServerVersion("note:missing"),
    ).rejects.toThrow("Conflict not found");
  });
});