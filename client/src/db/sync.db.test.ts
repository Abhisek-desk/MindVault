import "fake-indexeddb/auto";

import Dexie from "dexie";

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { db } from "./database";

import {
  getSyncDiagnostics,
  getLastSuccessfulSyncAt,
  saveLastSuccessfulSyncAt,
} from "./sync.db";

// =====================================
// DATABASE SETUP
// =====================================

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();

  await Dexie.delete("MindVaultDatabase");

  await Dexie.delete("MindVaultDatabase_anonymous");
});

// =====================================
// SYNC DIAGNOSTICS
// =====================================

describe("Sync diagnostics", () => {
  it("returns zero counts for an empty database", async () => {
    const result = await getSyncDiagnostics();

    expect(result).toEqual({
      pending: 0,
      processing: 0,
      failed: 0,
      conflicts: 0,
      totalQueued: 0,
    });
  });

  it("counts queued changes by status", async () => {
    await db.syncQueue.bulkAdd([
      {
        entityType: "note",
        entityId: "note-1",
        operation: "create",
        clientMutationId: "mutation-1",
        createdAt: "2026-01-01T10:00:00.000Z",
        status: "pending",
      },
      {
        entityType: "note",
        entityId: "note-2",
        operation: "update",
        clientMutationId: "mutation-2",
        createdAt: "2026-01-01T10:01:00.000Z",
        status: "pending",
      },
      {
        entityType: "folder",
        entityId: "folder-1",
        operation: "create",
        clientMutationId: "mutation-3",
        createdAt: "2026-01-01T10:02:00.000Z",
        status: "processing",
      },
      {
        entityType: "note",
        entityId: "note-3",
        operation: "delete",
        clientMutationId: "mutation-4",
        createdAt: "2026-01-01T10:03:00.000Z",
        status: "failed",
      },
    ]);

    const result = await getSyncDiagnostics();

    expect(result.pending).toBe(2);

    expect(result.processing).toBe(1);

    expect(result.failed).toBe(1);

    expect(result.totalQueued).toBe(4);
  });

  it("counts unresolved conflicts", async () => {
    await db.conflicts.add({
      id: "conflict-1",
      entityType: "note",
      entityId: "note-1",
      operation: "update",
      localData: null,
      serverData: null,
      serverChangeId: "server-change-1",
      detectedAt: "2026-01-01T10:00:00.000Z",
    });

    const result = await getSyncDiagnostics();

    expect(result.conflicts).toBe(1);
  });
});

// =====================================
// LAST SUCCESSFUL SYNC
// =====================================

describe("Last successful synchronization", () => {
  it("returns null when no successful sync exists", async () => {
    const result = await getLastSuccessfulSyncAt();

    expect(result).toBeNull();
  });

  it("rejects invalid timestamps", async () => {
    await expect(
      saveLastSuccessfulSyncAt(
        "invalid-date",
        "507f1f77bcf86cd799439011",
      ),
    ).rejects.toThrow("Invalid synchronization timestamp.");
  });

  it("rejects invalid account IDs", async () => {
    await expect(
      saveLastSuccessfulSyncAt(
        "2026-01-01T10:00:00.000Z",
        "invalid-user",
      ),
    ).rejects.toThrow("Invalid account ID.");
  });
});