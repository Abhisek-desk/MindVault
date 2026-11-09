import { describe, expect, it } from "vitest";
import { KnowledgePack } from "./knowledge-pack.model";

const validPack = {
  title: "JavaScript Fundamentals",
  description: "Learn JavaScript fundamentals.",
  category: "Programming",
  language: "en",
  version: "1.0.0",
  downloadUrl: "http://localhost:5000/downloads/javascript.zip",
  fileSizeBytes: 1024,
  tags: ["JavaScript", "Programming"],
  isPublished: true,
};

describe("Knowledge Pack Model Validation", () => {
  it("should accept a valid knowledge pack", async () => {
    const pack = new KnowledgePack(validPack);

    await expect(pack.validate()).resolves.toBeUndefined();
  });

  it("should reject titles longer than 150 characters", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      title: "a".repeat(151),
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject descriptions longer than 1000 characters", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      description: "a".repeat(1001),
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject categories longer than 100 characters", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      category: "a".repeat(101),
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject languages longer than 20 characters", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      language: "a".repeat(21),
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject versions longer than 50 characters", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      version: "a".repeat(51),
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject invalid download URLs", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      downloadUrl: "not-a-valid-url",
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject non-HTTP download URL protocols", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      downloadUrl: "javascript:alert(1)",
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject file sizes that are not integers", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      fileSizeBytes: 10.5,
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject negative file sizes", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      fileSizeBytes: -1,
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject more than 20 tags", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      tags: Array.from({ length: 21 }, (_, index) => `tag${index}`),
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should reject tags longer than 50 characters", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      tags: ["a".repeat(51)],
    });

    await expect(pack.validate()).rejects.toThrow();
  });

  it("should accept a null cover image", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      coverImage: null,
    });

    await expect(pack.validate()).resolves.toBeUndefined();
  });

  it("should reject cover image values longer than 2048 characters", async () => {
    const pack = new KnowledgePack({
      ...validPack,
      coverImage: "a".repeat(2049),
    });

    await expect(pack.validate()).rejects.toThrow();
  });
});