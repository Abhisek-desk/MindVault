import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Mock local embedding generation.
// Integration tests should not download the actual AI model.
vi.mock("../src/modules/ai/embedding.service", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(
    Array(384).fill(0.01)
  ),
}));

import app from "../src/app";

import { User } from "../src/modules/users/user.model";
import { Note } from "../src/modules/notes/note.model";
import { Folder } from "../src/modules/folders/folder.model";
import { SyncChange } from "../src/modules/sync/sync.model";

describe("Mind Vault Synchronization Integration Tests", () => {
  let replicaSet: MongoMemoryReplSet;

  const testUser = {
    name: "Integration Tester",
    email: "sync-test@example.com",
    password: "TestPassword123!",
  };

  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET =
      "integration-test-access-secret-123456789";

    process.env.JWT_REFRESH_SECRET =
      "integration-test-refresh-secret-123456789";

    process.env.NODE_ENV = "test";

    // Start isolated MongoDB replica set.
    replicaSet = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
      },
    });

    await mongoose.connect(replicaSet.getUri());

    // Ensure database indexes are initialized.
    await Promise.all(
      Object.values(mongoose.connection.models).map(
        (model) => model.init()
      )
    );

    agent = request.agent(app);
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();

    if (replicaSet) {
      await replicaSet.stop();
    }
  }, 120000);

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Note.deleteMany({}),
      Folder.deleteMany({}),
      SyncChange.deleteMany({}),
    ]);

    // Register a fresh user for each test.
    await agent
      .post("/api/v1/auth/register")
      .send(testUser)
      .expect(201);
  });

  const createFolder =  (
    folderId: string,
    mutationId: string,
    name = "Test Folder"
  ) => {
    return agent
      .post("/api/v1/sync/push")
      .send({
        changes: [
          {
            entityType: "folder",
            entityId: folderId,
            operation: "create",
            clientMutationId: mutationId,
            data: {
              name,
              color: "#F47768",
            },
          },
        ],
      });
  };

  const createNote =  (
    noteId: string,
    mutationId: string,
    folderId: string
  ) => {
    return agent
      .post("/api/v1/sync/push")
      .send({
        changes: [
          {
            entityType: "note",
            entityId: noteId,
            operation: "create",
            clientMutationId: mutationId,
            data: {
              title: "Integration Test Note",
              content: "Testing offline synchronization.",
              folderId,
            },
          },
        ],
      });
  };

  describe("Authentication", () => {
    it("should reject synchronization without authentication", async () => {
      await request(app)
        .post("/api/v1/sync/push")
        .send({
          changes: [],
        })
        .expect(401);
    });

    it("should register and authenticate a user", async () => {
      const response = await agent
        .get("/api/v1/auth/me")
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(response.body.user.email).toBe(
        testUser.email
      );
    });
  });

  describe("Folder synchronization", () => {
    it("should create a folder successfully", async () => {
      const folderId = new mongoose.Types.ObjectId().toString();

      const response = await createFolder(
        folderId,
        "11111111-1111-4111-8111-111111111111"
      );

      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(1);

      const folder = await Folder.findById(folderId);

      expect(folder).not.toBeNull();
      expect(folder?.name).toBe("Test Folder");
      expect(folder?.version).toBe(1);
    });
  });

  describe("Note synchronization", () => {
    it("should create a note inside a folder", async () => {
      const folderId = new mongoose.Types.ObjectId().toString();
      const noteId = new mongoose.Types.ObjectId().toString();

      await createFolder(
        folderId,
        "22222222-2222-4222-8222-222222222222"
      ).expect(200);

      const response = await createNote(
        noteId,
        "33333333-3333-4333-8333-333333333333",
        folderId
      );

      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(1);

      const note = await Note.findById(noteId);

      expect(note).not.toBeNull();
      expect(note?.title).toBe("Integration Test Note");
      expect(note?.folderId?.toString()).toBe(folderId);
      expect(note?.version).toBe(1);
    });
  });

  describe("Idempotency", () => {
    it("should not process the same mutation twice", async () => {
      const folderId = new mongoose.Types.ObjectId().toString();

      const mutationId =
        "44444444-4444-4444-8444-444444444444";

      const firstResponse = await createFolder(
        folderId,
        mutationId
      );

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.processed).toBe(1);
      expect(firstResponse.body.duplicates).toBe(0);

      const secondResponse = await createFolder(
        folderId,
        mutationId
      );

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.processed).toBe(0);
      expect(secondResponse.body.duplicates).toBe(1);

      const count = await Folder.countDocuments({
        _id: folderId,
      });

      expect(count).toBe(1);
    });

    it("should reject duplicate mutation IDs in one batch", async () => {
      const folderId1 = new mongoose.Types.ObjectId().toString();
      const folderId2 = new mongoose.Types.ObjectId().toString();

      const mutationId =
        "55555555-5555-4555-8555-555555555555";

      const response = await agent
        .post("/api/v1/sync/push")
        .send({
          changes: [
            {
              entityType: "folder",
              entityId: folderId1,
              operation: "create",
              clientMutationId: mutationId,
              data: {
                name: "First Folder",
              },
            },
            {
              entityType: "folder",
              entityId: folderId2,
              operation: "create",
              clientMutationId: mutationId,
              data: {
                name: "Second Folder",
              },
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      expect(
        await Folder.countDocuments({})
      ).toBe(0);
    });
  });

  describe("Optimistic concurrency control", () => {
    it("should reject an update with a stale note version", async () => {
      const noteId = new mongoose.Types.ObjectId().toString();

      const response = await agent
        .post("/api/v1/sync/push")
        .send({
          changes: [
            {
              entityType: "note",
              entityId: noteId,
              operation: "create",
              clientMutationId:
                "66666666-6666-4666-8666-666666666666",
              data: {
                title: "Original Note",
                content: "Original content",
              },
            },
          ],
        });

      expect(response.status).toBe(200);

      const updateResponse = await agent
        .post("/api/v1/sync/push")
        .send({
          changes: [
            {
              entityType: "note",
              entityId: noteId,
              operation: "update",
              clientMutationId:
                "77777777-7777-4777-8777-777777777777",
              expectedVersion: 5,
              data: {
                title: "Updated Note",
              },
            },
          ],
        });

      expect(updateResponse.status).toBe(409);

      expect(updateResponse.body.code).toBe(
        "NOTE_VERSION_CONFLICT"
      );

      const note = await Note.findById(noteId);

      expect(note?.title).toBe("Original Note");
      expect(note?.version).toBe(1);
    });

    it("should reject updates without an expected version", async () => {
      const noteId = new mongoose.Types.ObjectId().toString();

      const response = await agent
        .post("/api/v1/sync/push")
        .send({
          changes: [
            {
              entityType: "note",
              entityId: noteId,
              operation: "update",
              clientMutationId:
                "88888888-8888-4888-8888-888888888888",
              data: {
                title: "Updated Note",
              },
            },
          ],
        });

      expect(response.status).toBe(400);
    });
  });

  describe("Pull synchronization", () => {
    it("should retrieve changes using a cursor", async () => {
      const folderId1 = new mongoose.Types.ObjectId().toString();
      const folderId2 = new mongoose.Types.ObjectId().toString();

      await createFolder(
        folderId1,
        "99999999-9999-4999-8999-999999999991",
        "Folder One"
      ).expect(200);

      await createFolder(
        folderId2,
        "99999999-9999-4999-8999-999999999992",
        "Folder Two"
      ).expect(200);

      const firstResponse = await agent
        .get("/api/v1/sync/pull?limit=1")
        .expect(200);

      expect(firstResponse.body.count).toBe(1);
      expect(firstResponse.body.hasMore).toBe(true);
      expect(firstResponse.body.nextCursor).toBeTruthy();

      const cursor = firstResponse.body.nextCursor;

      const secondResponse = await agent
        .get(`/api/v1/sync/pull?limit=1&cursor=${cursor}`)
        .expect(200);

      expect(secondResponse.body.count).toBe(1);
      expect(secondResponse.body.hasMore).toBe(false);

      expect(
        secondResponse.body.changes[0].entityId
      ).not.toBe(firstResponse.body.changes[0].entityId);
    });
  });

  describe("Folder membership protection", () => {
    it("should reject deletion of a non-empty folder and roll back its lock", async () => {
      const folderId = new mongoose.Types.ObjectId().toString();
      const noteId = new mongoose.Types.ObjectId().toString();

      await createFolder(
        folderId,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      ).expect(200);

      await createNote(
        noteId,
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        folderId
      ).expect(200);

      const response = await agent
        .post("/api/v1/sync/push")
        .send({
          changes: [
            {
              entityType: "folder",
              entityId: folderId,
              operation: "delete",
              clientMutationId:
                "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              expectedVersion: 1,
            },
          ],
        });

      expect(response.status).toBe(409);

      expect(response.body.code).toBe(
        "FOLDER_NOT_EMPTY"
      );

      const folder = await Folder.findById(folderId);

      expect(folder).not.toBeNull();

      // Failed transaction must not leave the lock incremented.
      expect(folder?.membershipRevision).toBe(1);

      expect(
        await Note.exists({ _id: noteId })
      ).not.toBeNull();
    });
  });
});