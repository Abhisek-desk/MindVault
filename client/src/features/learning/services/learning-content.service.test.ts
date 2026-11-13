import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { getLocalPackById } from "../../../db/packs.db";

const { mockGetLocalPackById } = vi.hoisted(() => ({
  mockGetLocalPackById: vi.fn(),
}));

vi.mock("../../../db/packs.db", () => ({
  getLocalPackById: mockGetLocalPackById,
}));

import { openLearningPack } from "./learning-content.service";

// =====================================
// TEST DATA
// =====================================

const PACK_ID = "507f1f77bcf86cd799439011";

const MAX_PACK_SIZE = 50 * 1024 * 1024;
const MAX_LESSON_SIZE = 2 * 1024 * 1024;

const createZip = async (
  files: Record<string, string>,
): Promise<Blob> => {
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
  });
};

const createPack = async (
  files: Record<string, string>,
) => {
  return {
    id: PACK_ID,
    title: "JavaScript Complete Guide",
    description: "Learn JavaScript fundamentals.",
    category: "Programming",
    language: "English",
    version: "1.0.0",
    downloadedAt: new Date().toISOString(),
    fileSizeBytes: 1024,
    contentBlob: await createZip(files),
  };
};

const mockPack = async (
  files: Record<string, string>,
): Promise<void> => {
  const pack = await createPack(files);

  mockGetLocalPackById.mockResolvedValue(
    pack as Awaited<ReturnType<typeof getLocalPackById>>,
  );
};

// =====================================
// SETUP
// =====================================

beforeEach(() => {
  vi.clearAllMocks();
});

// =====================================
// OPEN KNOWLEDGE PACK
// =====================================

describe("openLearningPack", () => {
  it("opens a downloaded knowledge pack", async () => {
    await mockPack({
      "introduction.md": "# Introduction",
    });

    const result = await openLearningPack(PACK_ID);

    expect(result.packId).toBe(PACK_ID);
    expect(result.title).toBe("JavaScript Complete Guide");
    expect(result.description).toBe(
      "Learn JavaScript fundamentals.",
    );
    expect(result.category).toBe("Programming");
    expect(result.language).toBe("English");
  });

  it("rejects an invalid pack ID", async () => {
    await expect(
      openLearningPack("invalid-id"),
    ).rejects.toThrow("Invalid knowledge pack ID.");

    expect(mockGetLocalPackById).not.toHaveBeenCalled();
  });

  it("rejects a pack that is not downloaded", async () => {
    mockGetLocalPackById.mockResolvedValue(undefined);

    await expect(
      openLearningPack(PACK_ID),
    ).rejects.toThrow(
      "This knowledge pack is not downloaded on this device.",
    );
  });

  it("rejects unavailable downloaded content", async () => {
    mockGetLocalPackById.mockResolvedValue({
      id: PACK_ID,
      title: "Test Pack",
      description: "Test",
      category: "Programming",
      language: "English",
      contentBlob: undefined,
    });

    await expect(
      openLearningPack(PACK_ID),
    ).rejects.toThrow(
      "Downloaded knowledge pack content is unavailable.",
    );
  });

  it("rejects oversized ZIP files", async () => {
    const blob = new Blob(["test"]);

    Object.defineProperty(blob, "size", {
      value: MAX_PACK_SIZE + 1,
    });

    mockGetLocalPackById.mockResolvedValue({
      id: PACK_ID,
      title: "Large Pack",
      description: "Test",
      category: "Programming",
      language: "English",
      contentBlob: blob,
    });

    await expect(
      openLearningPack(PACK_ID),
    ).rejects.toThrow(
      "Knowledge pack exceeds the maximum allowed size.",
    );
  });

  it("rejects empty ZIP files", async () => {
    mockGetLocalPackById.mockResolvedValue({
      id: PACK_ID,
      title: "Empty Pack",
      description: "Test",
      category: "Programming",
      language: "English",
      contentBlob: new Blob([]),
    });

    await expect(
      openLearningPack(PACK_ID),
    ).rejects.toThrow(
      "Knowledge pack exceeds the maximum allowed size.",
    );
  });

  it("rejects corrupted ZIP files", async () => {
    mockGetLocalPackById.mockResolvedValue({
      id: PACK_ID,
      title: "Corrupted Pack",
      description: "Test",
      category: "Programming",
      language: "English",
      contentBlob: new Blob(["this is not a ZIP file"]),
    });

    await expect(
      openLearningPack(PACK_ID),
    ).rejects.toThrow(
      "Knowledge pack is damaged or has an invalid ZIP format.",
    );
  });

  it("rejects packs without readable lessons", async () => {
    await mockPack({
      "image.png": "not an image",
      "document.pdf": "not a PDF",
      "script.js": "console.log('hello')",
    });

    await expect(
      openLearningPack(PACK_ID),
    ).rejects.toThrow(
      "No readable Markdown or text lessons were found in this knowledge pack.",
    );
  });
});

// =====================================
// LESSON DISCOVERY
// =====================================

describe("Learning lesson discovery", () => {
  it("discovers Markdown, Markdown-long, and text lessons", async () => {
    await mockPack({
      "intro.md": "# Introduction",
      "guide.markdown": "# Guide",
      "notes.txt": "Some notes",
      "script.js": "console.log('ignored')",
    });

    const result = await openLearningPack(PACK_ID);

    expect(result.lessons).toHaveLength(3);

    expect(
      result.lessons.map((lesson) => lesson.id),
    ).toEqual([
      "guide.markdown",
      "intro.md",
      "notes.txt",
    ]);
  });

  it("creates readable lesson titles", async () => {
  await mockPack({
    "getting-started.md": "# Getting Started",
    "folder/advanced_topics.txt": "Advanced topics",
  });

  const result = await openLearningPack(PACK_ID);

  const gettingStarted = result.lessons.find(
    (lesson) => lesson.id === "getting-started.md",
  );

  const advancedTopics = result.lessons.find(
    (lesson) => lesson.id === "folder/advanced_topics.txt",
  );

  expect(gettingStarted?.title).toBe("getting started");
  expect(advancedTopics?.title).toBe("advanced topics");
});

  it("sorts lessons alphabetically by path", async () => {
    await mockPack({
      "zebra.md": "Zebra",
      "apple.md": "Apple",
      "folder/banana.md": "Banana",
    });

    const result = await openLearningPack(PACK_ID);

    expect(
      result.lessons.map((lesson) => lesson.path),
    ).toEqual([
      "apple.md",
      "folder/banana.md",
      "zebra.md",
    ]);
  });

  it("ignores hidden and unsafe lesson paths", async () => {
    await mockPack({
      "valid.md": "Valid lesson",
      ".hidden.md": "Hidden",
      "folder/.hidden.md": "Hidden",
      "__MACOSX/metadata.md": "Metadata",
      "folder/__MACOSX/metadata.md": "Metadata",
      "image.png": "Ignored",
    });

    const result = await openLearningPack(PACK_ID);

    expect(result.lessons).toHaveLength(1);
    expect(result.lessons[0].id).toBe("valid.md");
  });

  it("rejects packs containing more than 500 lessons", async () => {
    const files: Record<string, string> = {};

    for (let index = 0; index < 501; index += 1) {
      files[`lesson-${index}.md`] = `Lesson ${index}`;
    }

    await mockPack(files);

    await expect(
      openLearningPack(PACK_ID),
    ).rejects.toThrow(
      "This knowledge pack contains more than 500 readable lessons.",
    );
  });
});

// =====================================
// LESSON CONTENT
// =====================================

describe("Learning lesson content", () => {
  it("loads lesson content from the ZIP file", async () => {
    await mockPack({
      "introduction.md": "# Introduction\n\nWelcome to JavaScript.",
    });

    const result = await openLearningPack(PACK_ID);

    const content = await result.getLessonContent(
      "introduction.md",
    );

    expect(content).toBe(
      "# Introduction\n\nWelcome to JavaScript.",
    );
  });

  it("loads lessons from nested folders", async () => {
    await mockPack({
      "basics/variables.md": "# Variables\n\nLearn variables.",
    });

    const result = await openLearningPack(PACK_ID);

    const content = await result.getLessonContent(
      "basics/variables.md",
    );

    expect(content).toContain("# Variables");
  });

  it("rejects empty lesson IDs", async () => {
    await mockPack({
      "intro.md": "Introduction",
    });

    const result = await openLearningPack(PACK_ID);

    await expect(
      result.getLessonContent(""),
    ).rejects.toThrow("Invalid lesson ID.");
  });

  it("rejects whitespace-only lesson IDs", async () => {
    await mockPack({
      "intro.md": "Introduction",
    });

    const result = await openLearningPack(PACK_ID);

    await expect(
      result.getLessonContent("   "),
    ).rejects.toThrow("Invalid lesson ID.");
  });

  it("rejects lesson IDs longer than 200 characters", async () => {
    await mockPack({
      "intro.md": "Introduction",
    });

    const result = await openLearningPack(PACK_ID);

    await expect(
      result.getLessonContent("a".repeat(201)),
    ).rejects.toThrow("Invalid lesson ID.");
  });

  it("rejects lessons that do not belong to the pack", async () => {
    await mockPack({
      "intro.md": "Introduction",
    });

    const result = await openLearningPack(PACK_ID);

    await expect(
      result.getLessonContent("other-pack.md"),
    ).rejects.toThrow(
      "Lesson does not belong to this knowledge pack.",
    );
  });

  it("rejects lesson content exceeding 2 MB", async () => {
    await mockPack({
      "large.md": "a".repeat(MAX_LESSON_SIZE + 1),
    });

    const result = await openLearningPack(PACK_ID);

    await expect(
      result.getLessonContent("large.md"),
    ).rejects.toThrow(
      "This lesson exceeds the maximum allowed content size.",
    );
  });

  it("allows lesson content up to the 2 MB limit", async () => {
    const content = "a".repeat(MAX_LESSON_SIZE);

    await mockPack({
      "large.md": content,
    });

    const result = await openLearningPack(PACK_ID);

    await expect(
      result.getLessonContent("large.md"),
    ).resolves.toBe(content);
  });
});