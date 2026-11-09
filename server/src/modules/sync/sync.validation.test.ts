import { describe, expect, it } from "vitest";

import { pushSyncSchema } from "./sync.validation";

describe("Synchronization Input Validation", () => {
  const validNoteChange = {
    entityType: "note" as const,
    entityId: "507f1f77bcf86cd799439011",
    operation: "create" as const,
    clientMutationId: "550e8400-e29b-41d4-a716-446655440000",
    data: {
      title: "Test Note",
      content: "Test content",
      folderId: null,
    },
  };

  const validFolderChange = {
    entityType: "folder" as const,
    entityId: "507f1f77bcf86cd799439012",
    operation: "create" as const,
    clientMutationId: "550e8400-e29b-41d4-a716-446655440001",
    data: {
      name: "Test Folder",
      color: "#F47768",
    },
  };

  describe("Note content", () => {
    it("should accept note content up to 20,000 characters", () => {
      const result = pushSyncSchema.safeParse({
        changes: [
          {
            ...validNoteChange,
            data: {
              ...validNoteChange.data,
              content: "a".repeat(20000),
            },
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("should reject note content exceeding 20,000 characters", () => {
      const result = pushSyncSchema.safeParse({
        changes: [
          {
            ...validNoteChange,
            data: {
              ...validNoteChange.data,
              content: "a".repeat(20001),
            },
          },
        ],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Folder colors", () => {
    it("should accept valid six-digit hexadecimal colors", () => {
      const result = pushSyncSchema.safeParse({
        changes: [validFolderChange],
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid hexadecimal colors", () => {
      const result = pushSyncSchema.safeParse({
        changes: [
          {
            ...validFolderChange,
            data: {
              ...validFolderChange.data,
              color: "red",
            },
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it("should reject hexadecimal colors with incorrect length", () => {
      const result = pushSyncSchema.safeParse({
        changes: [
          {
            ...validFolderChange,
            data: {
              ...validFolderChange.data,
              color: "#FFF",
            },
          },
        ],
      });

      expect(result.success).toBe(false);
    });
  });
});