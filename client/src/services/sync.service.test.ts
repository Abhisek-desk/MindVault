import "fake-indexeddb/auto";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../db/database";
import { createLocalNote, updateLocalNote } from "../db/note.db";
import { getPendingChanges, resetPendingChanges } from "../db/sync.db";

import { apiRequest } from "./api";
import { pushLocalChanges, pullServerChanges } from "./sync.service";

// =====================================
// MOCK API REQUESTS
// =====================================

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

// =====================================
// TEST DATABASE SETUP
// =====================================

beforeEach(async () => {
  await db.delete();
  await db.open();

  vi.clearAllMocks();
});

afterAll(async () => {
  await db.delete();
});

// =====================================
// PUSH TESTS
// =====================================

describe("Push local changes", () => {
  it("uploads a pending note creation", async () => {
    const note = await createLocalNote(
      "Offline Note",
      "Created without internet",
    );

    mockedApiRequest.mockResolvedValue({
      success: true,
      processed: 1,
      duplicates: 0,
    } as never);

    await pushLocalChanges();

    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/sync/push",
      expect.objectContaining({
        method: "POST",
      }),
    );

    expect(await getPendingChanges()).toHaveLength(0);

    const savedNote = await db.notes.get(note.id);

    expect(savedNote?.version).toBe(1);
    expect(savedNote?.syncStatus).toBe("synced");
  });

  it("advances the local version after an update", async () => {
    const note = await createLocalNote("Original Note", "Original content");

    await db.syncQueue.clear();

    await db.notes.update(note.id, {
      version: 4,
      syncStatus: "synced",
    });

    await updateLocalNote(note.id, {
      title: "Updated Note",
    });

    mockedApiRequest.mockResolvedValue({
      success: true,
      processed: 1,
      duplicates: 0,
    } as never);

    await pushLocalChanges();

    const savedNote = await db.notes.get(note.id);

    expect(savedNote?.version).toBe(5);
    expect(savedNote?.syncStatus).toBe("synced");
    expect(await getPendingChanges()).toHaveLength(0);
  });

  it("preserves failed changes for future retry", async () => {
    await createLocalNote("Retry Note", "This change must not be lost");

    mockedApiRequest.mockRejectedValue(new Error("Network unavailable"));

    await expect(pushLocalChanges()).rejects.toThrow("Network unavailable");

    const changes = await db.syncQueue.toArray();

    expect(changes).toHaveLength(1);
    expect(changes[0].status).toBe("failed");
  });
});

// =====================================
// PULL TESTS
// =====================================

describe("Pull server changes", () => {
  it("downloads a remote note into IndexedDB", async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
      count: 1,
      hasMore: false,
      nextCursor: "507f1f77bcf86cd799439011",
      changes: [
        {
          id: "507f1f77bcf86cd799439012",
          entityType: "note",
          entityId: "507f1f77bcf86cd799439013",
          operation: "create",
          data: {
            title: "Remote Note",
            content: "Downloaded from server",
            folderId: null,
            version: 3,
            createdAt: "2026-11-08T10:00:00.000Z",
            updatedAt: "2026-11-08T11:00:00.000Z",
          },
          createdAt: "2026-11-08T11:00:00.000Z",
        },
      ],
    } as never);

    await pullServerChanges();

    const note = await db.notes.get("507f1f77bcf86cd799439013");

    expect(note).toBeDefined();
    expect(note?.title).toBe("Remote Note");
    expect(note?.content).toBe("Downloaded from server");
    expect(note?.version).toBe(3);
    expect(note?.syncStatus).toBe("synced");
  });

  it("saves the server cursor after pulling changes", async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
      count: 0,
      hasMore: false,
      nextCursor: "507f1f77bcf86cd799439014",
      changes: [],
    } as never);

    await pullServerChanges();

    const metadata = await db.syncMeta.get("lastSyncCursor");

    expect(metadata?.value).toBe("507f1f77bcf86cd799439014");
  });

  it("detects conflicts when local changes already exist", async () => {
    const note = await createLocalNote("My Local Note", "Local content");

    mockedApiRequest.mockResolvedValue({
      success: true,
      count: 1,
      hasMore: false,
      nextCursor: "507f1f77bcf86cd799439015",
      changes: [
        {
          id: "507f1f77bcf86cd799439016",
          entityType: "note",
          entityId: note.id,
          operation: "update",
          data: {
            title: "Server Note",
            content: "Server content",
            folderId: null,
            version: 2,
          },
          createdAt: "2026-11-08T12:00:00.000Z",
        },
      ],
    } as never);

    await pullServerChanges();

    const conflict = await db.conflicts.get(`note:${note.id}`);

    const savedNote = await db.notes.get(note.id);

    expect(conflict).toBeDefined();
    expect(conflict?.localData?.title).toBe("My Local Note");
    expect(conflict?.serverData?.title).toBe("Server Note");

    expect(savedNote?.syncStatus).toBe("conflict");

    // Local queued changes must remain untouched.
    expect(await getPendingChanges()).toHaveLength(1);
  });
});
describe("Interrupted synchronization recovery", () => {
  it("restores processing and failed changes to pending", async () => {
    await createLocalNote(
      "Processing Note",
      "Interrupted during synchronization",
    );

    await createLocalNote("Failed Note", "Failed during synchronization");

    const changes = await db.syncQueue.toArray();

    await db.syncQueue.update(changes[0].id!, {
      status: "processing",
    });

    await db.syncQueue.update(changes[1].id!, {
      status: "failed",
    });

    await resetPendingChanges();

    const recovered = await getPendingChanges();

    expect(recovered).toHaveLength(2);

    expect(recovered.every((change) => change.status === "pending")).toBe(true);
  });
});
