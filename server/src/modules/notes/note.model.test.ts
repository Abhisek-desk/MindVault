import { describe, expect, it } from "vitest";
import mongoose from "mongoose";

import { Note } from "./note.model";

describe("Note Model Validation", () => {
  const validNote = {
    userId: new mongoose.Types.ObjectId(),
    title: "Test Note",
  };

  it("should accept note content up to 20,000 characters", async () => {
    const note = new Note({
      ...validNote,
      content: "a".repeat(20000),
    });

    await expect(note.validate()).resolves.toBeUndefined();
  });

  it("should reject note content exceeding 20,000 characters", async () => {
    const note = new Note({
      ...validNote,
      content: "a".repeat(20001),
    });

    await expect(note.validate()).rejects.toThrow();
  });

  it("should allow empty note content", async () => {
    const note = new Note({
      ...validNote,
      content: "",
    });

    await expect(note.validate()).resolves.toBeUndefined();
  });
  it("should accept note titles up to 200 characters", async () => {
    const note = new Note({
      ...validNote,
      title: "a".repeat(200),
    });

    await expect(note.validate()).resolves.toBeUndefined();
  });

  it("should reject note titles exceeding 200 characters", async () => {
    const note = new Note({
      ...validNote,
      title: "a".repeat(201),
    });

    await expect(note.validate()).rejects.toThrow();
  });
});
