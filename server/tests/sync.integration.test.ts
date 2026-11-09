import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import mongoose from "mongoose";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Mock local embedding generation.
// Integration tests should not download the actual AI model.
vi.mock("../src/modules/ai/embedding.service", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(Array(384).fill(0.01)),
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
  let originalRefreshCookie = "";

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = "integration-test-access-secret-123456789";

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
      Object.values(mongoose.connection.models).map((model) => model.init()),
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
    const registrationResponse = await agent
      .post("/api/v1/auth/register")
      .send(testUser)
      .expect(201);

    // Capture the original refresh token for security tests.
    const cookies = registrationResponse.headers["set-cookie"] ?? [];

    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith("refreshToken="),
    );

    if (!refreshCookie) {
      throw new Error("Registration did not return a refresh token cookie.");
    }

    originalRefreshCookie = refreshCookie.split(";")[0];
  });

  const createFolder = (
    folderId: string,
    mutationId: string,
    name = "Test Folder",
  ) => {
    return agent.post("/api/v1/sync/push").send({
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

  const createNote = (noteId: string, mutationId: string, folderId: string) => {
    return agent.post("/api/v1/sync/push").send({
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

  // ========================================
  // AUTHENTICATION TESTS
  // ========================================

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
      const response = await agent.get("/api/v1/auth/me").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it("should reject login with an incorrect password", async () => {
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: "IncorrectPassword123!",
        })
        .expect(401);
    });

    it("should reject login with invalid input", async () => {
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "invalid-email",
          password: "password",
        })
        .expect(400);
    });

    it("should reject access to protected routes without an access token", async () => {
      await request(app).get("/api/v1/auth/me").expect(401);
    });

    it("should reject an invalid access token", async () => {
      await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", "accessToken=invalid-token")
        .expect(401);
    });

    it("should reject JWTs signed with an unexpected algorithm", async () => {
      const token = jwt.sign(
        {
          sub: new mongoose.Types.ObjectId().toString(),
        },
        process.env.JWT_ACCESS_SECRET!,
        {
          algorithm: "HS384",
          expiresIn: "15m",
        },
      );

      await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", `accessToken=${token}`)
        .expect(401);
    });

    it("should reject refresh requests without a refresh token", async () => {
      await request(app).post("/api/v1/auth/refresh").expect(401);
    });

    it("should reject invalid refresh tokens", async () => {
      await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", "refreshToken=invalid-token")
        .expect(401);
    });

    it("should successfully refresh and rotate tokens", async () => {
      const response = await agent.post("/api/v1/auth/refresh").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers["set-cookie"]).toBeDefined();

      // The rotated session must remain authenticated.
      await agent.get("/api/v1/auth/me").expect(200);
    });

    it("should reject reuse of an old refresh token", async () => {
      // Extract the original refresh token.
      const oldToken = originalRefreshCookie.replace("refreshToken=", "");

      expect(oldToken.length).toBeGreaterThan(50);

      const oldPayload = jwt.decode(oldToken) as jwt.JwtPayload;

      // Perform the first refresh.
      const refreshResponse = await agent
        .post("/api/v1/auth/refresh")
        .expect(200);

      // Extract the newly issued refresh cookie.
      const cookies = refreshResponse.headers["set-cookie"] ?? [];

      const newRefreshCookie = cookies.find((cookie) =>
        cookie.startsWith("refreshToken="),
      );

      expect(newRefreshCookie).toBeDefined();

      const newToken = newRefreshCookie!
        .split(";")[0]
        .replace("refreshToken=", "");

      const newPayload = jwt.decode(newToken) as jwt.JwtPayload;

      // Verify that the new token has a unique JWT ID.
      expect(newPayload.jti).toBeDefined();
      expect(newPayload.jti).not.toBe(oldPayload.jti);

      // Retrieve the user's current refresh-token hash.
      const user = await User.findOne({
        email: testUser.email,
      }).select("+refreshTokenHash");

      expect(user).not.toBeNull();
      expect(user?.refreshTokenHash).toBeDefined();

      // Compare both tokens against the stored hash.
      const oldTokenStillValid =
        createHash("sha256").update(oldToken, "utf8").digest("hex") ===
        user!.refreshTokenHash;

      const newTokenStillValid =
        createHash("sha256").update(newToken, "utf8").digest("hex") ===
        user!.refreshTokenHash;

      // Temporary diagnostics.
      console.log("Refresh rotation diagnostics:", {
        oldAndNewTokensAreDifferent: oldToken !== newToken,
        oldTokenMatchesStoredHash: oldTokenStillValid,
        newTokenMatchesStoredHash: newTokenStillValid,
      });

      // The original token must no longer match.
      expect(oldTokenStillValid).toBe(false);

      // The newly issued token must match.
      expect(newTokenStillValid).toBe(true);

      // Attempt to reuse the original refresh token.
      await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", originalRefreshCookie)
        .expect(401);
    });

    it("should invalidate refresh tokens after logout", async () => {
      await agent.post("/api/v1/auth/logout").expect(200);

      await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", originalRefreshCookie)
        .expect(401);
    });

    it("should allow only one concurrent refresh using the same token", async () => {
      const [firstResponse, secondResponse] = await Promise.all([
        request(app)
          .post("/api/v1/auth/refresh")
          .set("Cookie", originalRefreshCookie),

        request(app)
          .post("/api/v1/auth/refresh")
          .set("Cookie", originalRefreshCookie),
      ]);

      const statuses = [firstResponse.status, secondResponse.status].sort(
        (a, b) => a - b,
      );

      expect(statuses).toEqual([200, 401]);
    });
  });

  // ========================================
  // FOLDER SYNCHRONIZATION
  // ========================================

  describe("Folder synchronization", () => {
    it("should create a folder successfully", async () => {
      const folderId = new mongoose.Types.ObjectId().toString();

      const response = await createFolder(
        folderId,
        "11111111-1111-4111-8111-111111111111",
      );

      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(1);

      const folder = await Folder.findById(folderId);

      expect(folder).not.toBeNull();
      expect(folder?.name).toBe("Test Folder");
      expect(folder?.version).toBe(1);
    });
  });

  // ========================================
  // NOTE SYNCHRONIZATION
  // ========================================

  describe("Note synchronization", () => {
    it("should create a note inside a folder", async () => {
      const folderId = new mongoose.Types.ObjectId().toString();
      const noteId = new mongoose.Types.ObjectId().toString();

      await createFolder(
        folderId,
        "22222222-2222-4222-8222-222222222222",
      ).expect(200);

      const response = await createNote(
        noteId,
        "33333333-3333-4333-8333-333333333333",
        folderId,
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

  // ========================================
  // IDEMPOTENCY
  // ========================================

  describe("Idempotency", () => {
    it("should not process the same mutation twice", async () => {
      const folderId = new mongoose.Types.ObjectId().toString();

      const mutationId = "44444444-4444-4444-8444-444444444444";

      const firstResponse = await createFolder(folderId, mutationId);

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.processed).toBe(1);
      expect(firstResponse.body.duplicates).toBe(0);

      const secondResponse = await createFolder(folderId, mutationId);

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

      const mutationId = "55555555-5555-4555-8555-555555555555";

      const response = await agent.post("/api/v1/sync/push").send({
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

      expect(await Folder.countDocuments({})).toBe(0);
    });
  });

  // ========================================
  // OPTIMISTIC CONCURRENCY CONTROL
  // ========================================

  describe("Optimistic concurrency control", () => {
    it("should reject an update with a stale note version", async () => {
      const noteId = new mongoose.Types.ObjectId().toString();

      const response = await agent.post("/api/v1/sync/push").send({
        changes: [
          {
            entityType: "note",
            entityId: noteId,
            operation: "create",
            clientMutationId: "66666666-6666-4666-8666-666666666666",
            data: {
              title: "Original Note",
              content: "Original content",
            },
          },
        ],
      });

      expect(response.status).toBe(200);

      const updateResponse = await agent.post("/api/v1/sync/push").send({
        changes: [
          {
            entityType: "note",
            entityId: noteId,
            operation: "update",
            clientMutationId: "77777777-7777-4777-8777-777777777777",
            expectedVersion: 5,
            data: {
              title: "Updated Note",
            },
          },
        ],
      });

      expect(updateResponse.status).toBe(409);
      expect(updateResponse.body.code).toBe("NOTE_VERSION_CONFLICT");

      const note = await Note.findById(noteId);

      expect(note?.title).toBe("Original Note");
      expect(note?.version).toBe(1);
    });

    it("should reject updates without an expected version", async () => {
      const noteId = new mongoose.Types.ObjectId().toString();

      const response = await agent.post("/api/v1/sync/push").send({
        changes: [
          {
            entityType: "note",
            entityId: noteId,
            operation: "update",
            clientMutationId: "88888888-8888-4888-8888-888888888888",
            data: {
              title: "Updated Note",
            },
          },
        ],
      });

      expect(response.status).toBe(400);
    });
  });

  // ========================================
  // PULL SYNCHRONIZATION
  // ========================================

  describe("Pull synchronization", () => {
    it("should retrieve changes using a cursor", async () => {
      const folderId1 = new mongoose.Types.ObjectId().toString();
      const folderId2 = new mongoose.Types.ObjectId().toString();

      await createFolder(
        folderId1,
        "99999999-9999-4999-8999-999999999991",
        "Folder One",
      ).expect(200);

      await createFolder(
        folderId2,
        "99999999-9999-4999-8999-999999999992",
        "Folder Two",
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

      expect(secondResponse.body.changes[0].entityId).not.toBe(
        firstResponse.body.changes[0].entityId,
      );
    });
  });

  // ========================================
  // FOLDER MEMBERSHIP PROTECTION
  // ========================================

  describe("Folder membership protection", () => {
    it("should reject deletion of a non-empty folder and roll back its lock", async () => {
      const folderId = new mongoose.Types.ObjectId().toString();
      const noteId = new mongoose.Types.ObjectId().toString();

      await createFolder(
        folderId,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ).expect(200);

      await createNote(
        noteId,
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        folderId,
      ).expect(200);

      const response = await agent.post("/api/v1/sync/push").send({
        changes: [
          {
            entityType: "folder",
            entityId: folderId,
            operation: "delete",
            clientMutationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            expectedVersion: 1,
          },
        ],
      });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("FOLDER_NOT_EMPTY");

      const folder = await Folder.findById(folderId);

      expect(folder).not.toBeNull();

      // Failed transaction must not leave the lock incremented.
      expect(folder?.membershipRevision).toBe(1);

      expect(await Note.exists({ _id: noteId })).not.toBeNull();
    });
  });
});
