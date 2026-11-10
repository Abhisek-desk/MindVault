import "fake-indexeddb/auto";

import JSZip from "jszip";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { db } from "../db/database";
import { searchOfflineContent } from "./search.service";

// =====================================
// TEST DATABASE SETUP
// =====================================

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await db.delete();
});

// =====================================
// TEST HELPERS
// =====================================

const createTestNote = async (
  title: string,
  content: string,
) => {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

  await db.notes.put({
    id,
    title,
    content,
    folderId: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: "synced",
  });

  return id;
};

const createTestPack = async (
  title: string,
  content: string,
) => {
  const zip = new JSZip();

  zip.file("guide.md", content);

  const contentBlob = await zip.generateAsync({
    type: "blob",
  });

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

  await db.packs.put({
    id,
    title,
    description: "Search test pack",
    category: "programming",
    language: "en",
    version: "1.0.0",
    downloadedAt: new Date().toISOString(),
    fileSizeBytes: contentBlob.size,
    contentBlob,
  });

  return id;
};

// =====================================
// SEARCH FUNCTIONALITY
// =====================================

describe("Offline search service", () => {
  it("returns an empty array for an empty query", async () => {
    expect(await searchOfflineContent("")).toEqual([]);
    expect(await searchOfflineContent("   ")).toEqual([]);
  });

  it("finds matching local notes", async () => {
    const noteId = await createTestNote(
      "JavaScript Guide",
      "JavaScript is a programming language used for web development.",
    );

    const results = await searchOfflineContent("JavaScript");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("note");
    expect(results[0].noteId).toBe(noteId);
    expect(results[0].title).toBe("JavaScript Guide");
    expect(results[0].snippet).toContain("JavaScript");
  });

  it("finds content inside downloaded knowledge packs", async () => {
    const packId = await createTestPack(
      "Python Complete Guide",
      "Python supports object oriented programming and automation.",
    );

    const results = await searchOfflineContent("automation");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("pack");
    expect(results[0].packId).toBe(packId);
    expect(results[0].documentName).toBe("guide.md");
  });

  it("reuses the cached index across multiple searches", async () => {
    await createTestNote(
      "React Guide",
      "React is used to build user interfaces.",
    );

    const notesSpy = vi.spyOn(db.notes, "toArray");
    const packsSpy = vi.spyOn(db.packs, "toArray");

    await searchOfflineContent("React");
    await searchOfflineContent("interfaces");

    expect(notesSpy).toHaveBeenCalledTimes(1);
    expect(packsSpy).toHaveBeenCalledTimes(1);
  });

  it("rebuilds the index when a note is added", async () => {
    await createTestNote(
      "Original Note",
      "This note contains ordinary information.",
    );

    const initialResults = await searchOfflineContent("quantumphysics");

    expect(initialResults).toHaveLength(0);

    await createTestNote(
      "Quantum Physics",
      "Quantumphysics is a fascinating subject.",
    );

    const updatedResults = await searchOfflineContent("quantumphysics");

    expect(updatedResults.length).toBeGreaterThan(0);
    expect(updatedResults[0].title).toBe("Quantum Physics");
  });

  it("rebuilds the index when a knowledge pack is added", async () => {
    const initialResults = await searchOfflineContent("datastructures");

    expect(initialResults).toHaveLength(0);

    await createTestPack(
      "DSA Guide",
      "Datastructures include arrays, linked lists and trees.",
    );

    const updatedResults = await searchOfflineContent("datastructures");

    expect(updatedResults.length).toBeGreaterThan(0);
    expect(updatedResults[0].type).toBe("pack");
  });

  it("rebuilds the index when a knowledge pack is deleted", async () => {
    const packId = await createTestPack(
      "Python Guide",
      "UniquePythonTopic explains programming concepts.",
    );

    const initialResults = await searchOfflineContent("UniquePythonTopic");

    expect(initialResults.length).toBeGreaterThan(0);

    await db.packs.delete(packId);

    const updatedResults = await searchOfflineContent("UniquePythonTopic");

    expect(updatedResults).toHaveLength(0);
  });

  it("shares an index build between simultaneous searches", async () => {
    await createTestNote(
      "Concurrent Search",
      "Concurrent searches should share the same index.",
    );

    const notesSpy = vi.spyOn(db.notes, "toArray");
    const packsSpy = vi.spyOn(db.packs, "toArray");

    const results = await Promise.all([
      searchOfflineContent("Concurrent"),
      searchOfflineContent("searches"),
      searchOfflineContent("index"),
    ]);

    expect(results).toHaveLength(3);
    expect(notesSpy).toHaveBeenCalledTimes(1);
    expect(packsSpy).toHaveBeenCalledTimes(1);
  });
});
