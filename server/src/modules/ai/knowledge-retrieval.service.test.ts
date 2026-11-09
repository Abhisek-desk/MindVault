import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  generateEmbedding: vi.fn()
}));

vi.mock("../notes/note.model", () => ({
  Note: {
    find: mocks.find
  }
}));

vi.mock("./embedding.service", () => ({
  generateEmbedding: mocks.generateEmbedding
}));

import { retrieveRelevantNotes } from "./knowledge-retrieval.service";

const validEmbedding = Array(384).fill(0.01);

const createNote = (
  title: string,
  content: string,
  embedding: number[] = validEmbedding
) => ({
  title,
  content,
  embedding,
  updatedAt: new Date()
});

const mockNotes = (notes: ReturnType<typeof createNote>[]) => {
  const query = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(notes)
  };

  mocks.find.mockReturnValue(query);

  return query;
};

describe("Knowledge Retrieval Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateEmbedding.mockResolvedValue(validEmbedding);
  });

  it("should retrieve only the requested user's notes", async () => {
    mockNotes([
      createNote("JavaScript", "JavaScript programming notes")
    ]);

    const results = await retrieveRelevantNotes(
      "user-123",
      "JavaScript programming"
    );

    expect(mocks.find).toHaveBeenCalledWith({
      userId: "user-123"
    });

    expect(results).toHaveLength(1);
  });

  it("should use keyword search when embedding generation fails", async () => {
    mocks.generateEmbedding.mockRejectedValue(
      new Error("Embedding model unavailable")
    );

    mockNotes([
      createNote(
        "Python",
        "Python programming language notes",
        []
      )
    ]);

    const results = await retrieveRelevantNotes(
      "user-123",
      "Python programming"
    );

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Python");
  });

  it("should retain keyword matches when a note has an invalid embedding", async () => {
    mockNotes([
      createNote(
        "JavaScript",
        "JavaScript programming notes",
        [NaN, Infinity]
      )
    ]);

    const results = await retrieveRelevantNotes(
      "user-123",
      "JavaScript programming"
    );

    expect(results).toHaveLength(1);
  });

  it("should return no more than five notes", async () => {
    mockNotes(
      Array.from({ length: 10 }, (_, index) =>
        createNote(
          `JavaScript ${index}`,
          "JavaScript programming notes"
        )
      )
    );

    const results = await retrieveRelevantNotes(
      "user-123",
      "JavaScript programming"
    );

    expect(results).toHaveLength(5);
  });

  it("should limit retrieved note content to 3000 characters", async () => {
    mockNotes([
      createNote(
        "JavaScript",
        "JavaScript ".repeat(500)
      )
    ]);

    const results = await retrieveRelevantNotes(
      "user-123",
      "JavaScript"
    );

    expect(results).toHaveLength(1);
    expect(results[0].content.length).toBe(3000);
  });

  it("should return an empty array for an empty question", async () => {
    const results = await retrieveRelevantNotes(
      "user-123",
      "   "
    );

    expect(results).toEqual([]);
    expect(mocks.find).not.toHaveBeenCalled();
  });
});