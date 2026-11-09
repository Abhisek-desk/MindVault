import { describe, expect, it } from "vitest";

import {
  getKnowledgePacksSchema,
  knowledgePackIdSchema,
} from "./knowledge-pack.validation";

describe("Knowledge Pack Validation", () => {
  describe("Query validation", () => {
    it("should accept valid query parameters", () => {
      const result = getKnowledgePacksSchema.safeParse({
        category: "Programming",
        language: "en",
        search: "JavaScript",
        page: "1",
        limit: "10",
      });

      expect(result.success).toBe(true);
    });

    it("should apply default pagination values", () => {
      const result = getKnowledgePacksSchema.safeParse({});

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it("should reject categories longer than 100 characters", () => {
      const result = getKnowledgePacksSchema.safeParse({
        category: "a".repeat(101),
      });

      expect(result.success).toBe(false);
    });

    it("should reject languages longer than 20 characters", () => {
      const result = getKnowledgePacksSchema.safeParse({
        language: "a".repeat(21),
      });

      expect(result.success).toBe(false);
    });

    it("should reject search queries longer than 200 characters", () => {
      const result = getKnowledgePacksSchema.safeParse({
        search: "a".repeat(201),
      });

      expect(result.success).toBe(false);
    });

    it("should reject page numbers below 1", () => {
      const result = getKnowledgePacksSchema.safeParse({
        page: "0",
      });

      expect(result.success).toBe(false);
    });

    it("should reject page numbers greater than 1,000,000", () => {
      const result = getKnowledgePacksSchema.safeParse({
        page: "1000001",
      });

      expect(result.success).toBe(false);
    });

    it("should reject limits greater than 50", () => {
      const result = getKnowledgePacksSchema.safeParse({
        limit: "51",
      });

      expect(result.success).toBe(false);
    });

    it("should accept the maximum allowed limit", () => {
      const result = getKnowledgePacksSchema.safeParse({
        limit: "50",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Knowledge Pack ID validation", () => {
    it("should accept a valid MongoDB ObjectId", () => {
      const result = knowledgePackIdSchema.safeParse({
        id: "507f1f77bcf86cd799439011",
      });

      expect(result.success).toBe(true);
    });

    it("should reject an invalid MongoDB ObjectId", () => {
      const result = knowledgePackIdSchema.safeParse({
        id: "invalid-id",
      });

      expect(result.success).toBe(false);
    });
  });
});
