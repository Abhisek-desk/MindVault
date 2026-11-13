import "fake-indexeddb/auto";

import Dexie from "dexie";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "./database";

import {
  getLearningProgress,
  getAllLearningProgress,
  saveLearningProgress,
  startLearning,
  updateLessonProgress,
  markLearningProgressSynced,
  getPendingLearningProgress,
  deleteLearningProgress,
} from "./learning.db";

// =====================================
// TEST DATA
// =====================================

const packA = "507f1f77bcf86cd799439011";
const packB = "507f191e810c19729de860ea";

// =====================================
// DATABASE SETUP
// =====================================

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();
  await Dexie.delete("MindVaultDatabase");
  await Dexie.delete("MindVaultDatabase_anonymous");
});

// =====================================
// START LEARNING
// =====================================

describe("Start learning", () => {
  it("creates initial learning progress", async () => {
    const progress = await startLearning(packA, 5);

    expect(progress.packId).toBe(packA);
    expect(progress.completedTopics).toEqual([]);
    expect(progress.totalTopics).toBe(5);
    expect(progress.progressPercentage).toBe(0);
    expect(progress.status).toBe("not-started");
    expect(progress.syncStatus).toBe("pending");

    expect(await db.learningProgress.get(packA)).toBeDefined();
  });

  it("preserves existing progress when learning is started again", async () => {
    await startLearning(packA, 5);
    await updateLessonProgress(packA, "lesson-1.md", 5, true);

    const progress = await startLearning(packA, 5);

    expect(progress.completedTopics).toEqual(["lesson-1.md"]);
    expect(progress.progressPercentage).toBe(20);
    expect(progress.status).toBe("in-progress");
  });

  it("rejects invalid pack IDs", async () => {
    await expect(startLearning("invalid-id", 5)).rejects.toThrow(
      "Invalid knowledge pack ID.",
    );
  });

  it("rejects invalid lesson counts", async () => {
    await expect(startLearning(packA, 0)).rejects.toThrow(
      "Invalid total lesson count.",
    );

    await expect(startLearning(packA, 501)).rejects.toThrow(
      "Invalid total lesson count.",
    );
  });
});

// =====================================
// UPDATE LESSON PROGRESS
// =====================================

describe("Update lesson progress", () => {
  it("marks a lesson as completed", async () => {
    const progress = await updateLessonProgress(
      packA,
      "lesson-1.md",
      4,
      true,
    );

    expect(progress.completedTopics).toEqual(["lesson-1.md"]);
    expect(progress.progressPercentage).toBe(25);
    expect(progress.status).toBe("in-progress");
    expect(progress.syncStatus).toBe("pending");
  });

  it("calculates completion percentage correctly", async () => {
    await startLearning(packA, 4);

    await updateLessonProgress(packA, "lesson-1.md", 4, true);
    await updateLessonProgress(packA, "lesson-2.md", 4, true);

    const progress = await getLearningProgress(packA);

    expect(progress?.progressPercentage).toBe(50);
    expect(progress?.completedTopics).toHaveLength(2);
  });

  it("marks learning as completed when every lesson is completed", async () => {
    await startLearning(packA, 2);

    await updateLessonProgress(packA, "lesson-1.md", 2, true);

    const progress = await updateLessonProgress(
      packA,
      "lesson-2.md",
      2,
      true,
    );

    expect(progress.progressPercentage).toBe(100);
    expect(progress.status).toBe("completed");
    expect(progress.completedTopics).toHaveLength(2);
  });

  it("allows a completed lesson to be marked incomplete", async () => {
    await startLearning(packA, 2);

    await updateLessonProgress(packA, "lesson-1.md", 2, true);

    const progress = await updateLessonProgress(
      packA,
      "lesson-1.md",
      2,
      false,
    );

    expect(progress.completedTopics).toEqual([]);
    expect(progress.progressPercentage).toBe(0);
    expect(progress.status).toBe("not-started");
  });

  it("does not duplicate completed lessons", async () => {
    await startLearning(packA, 3);

    await updateLessonProgress(packA, "lesson-1.md", 3, true);
    await updateLessonProgress(packA, "lesson-1.md", 3, true);

    const progress = await getLearningProgress(packA);

    expect(progress?.completedTopics).toEqual(["lesson-1.md"]);
    expect(progress?.progressPercentage).toBe(33);
  });

  it("remembers the last opened lesson", async () => {
    const progress = await updateLessonProgress(
      packA,
      "lesson-3.md",
      5,
      false,
    );

    expect(progress.lastLessonId).toBe("lesson-3.md");
  });

  it("rejects invalid lesson IDs", async () => {
    await expect(
      updateLessonProgress(packA, "   ", 5, true),
    ).rejects.toThrow("Invalid lesson ID.");
  });

  it("rejects invalid completion values", async () => {
    await expect(
      updateLessonProgress(
        packA,
        "lesson-1.md",
        5,
        "yes" as unknown as boolean,
      ),
    ).rejects.toThrow("Invalid lesson completion value.");
  });

  it("rejects more completed lessons than the total lesson count", async () => {
    await updateLessonProgress(packA, "lesson-1.md", 1, true);

    await expect(
      updateLessonProgress(packA, "lesson-2.md", 1, true),
    ).rejects.toThrow("Completed lessons exceed total lessons.");
  });
});

// =====================================
// GET AND SAVE PROGRESS
// =====================================

describe("Learning progress retrieval and storage", () => {
  it("returns undefined when progress does not exist", async () => {
    expect(await getLearningProgress(packA)).toBeUndefined();
  });

  it("returns progress for a specific pack", async () => {
    await startLearning(packA, 5);

    const progress = await getLearningProgress(packA);

    expect(progress?.packId).toBe(packA);
    expect(progress?.totalTopics).toBe(5);
  });

  it("returns all learning progress records", async () => {
    await startLearning(packA, 5);
    await startLearning(packB, 3);

    const progress = await getAllLearningProgress();

    expect(progress).toHaveLength(2);
    expect(progress.map((item) => item.packId)).toContain(packA);
    expect(progress.map((item) => item.packId)).toContain(packB);
  });

  it("saves a valid learning progress record", async () => {
    const now = new Date().toISOString();

    await saveLearningProgress({
      packId: packA,
      completedTopics: ["lesson-1.md"],
      totalTopics: 5,
      progressPercentage: 20,
      status: "in-progress",
      startedAt: now,
      updatedAt: now,
      lastLessonId: "lesson-1.md",
      syncStatus: "pending",
    });

    const saved = await getLearningProgress(packA);

    expect(saved?.completedTopics).toEqual(["lesson-1.md"]);
    expect(saved?.progressPercentage).toBe(20);
  });

  it("rejects duplicate completed lesson IDs", async () => {
    const now = new Date().toISOString();

    await expect(
      saveLearningProgress({
        packId: packA,
        completedTopics: ["lesson-1.md", "lesson-1.md"],
        totalTopics: 5,
        progressPercentage: 40,
        status: "in-progress",
        startedAt: now,
        updatedAt: now,
        lastLessonId: null,
        syncStatus: "pending",
      }),
    ).rejects.toThrow("Duplicate completed lesson.");
  });

  it("rejects completed lessons exceeding the total", async () => {
    const now = new Date().toISOString();

    await expect(
      saveLearningProgress({
        packId: packA,
        completedTopics: ["lesson-1.md", "lesson-2.md"],
        totalTopics: 1,
        progressPercentage: 100,
        status: "completed",
        startedAt: now,
        updatedAt: now,
        lastLessonId: null,
        syncStatus: "pending",
      }),
    ).rejects.toThrow("Completed lessons exceed total lessons.");
  });
});

// =====================================
// LEARNING SYNCHRONIZATION
// =====================================

describe("Learning progress synchronization", () => {
  it("returns only pending learning progress", async () => {
    await startLearning(packA, 5);
    await startLearning(packB, 3);

    await markLearningProgressSynced(packA);

    const pending = await getPendingLearningProgress();

    expect(pending).toHaveLength(1);
    expect(pending[0].packId).toBe(packB);
  });

  it("marks progress as synchronized", async () => {
    await startLearning(packA, 5);

    await markLearningProgressSynced(packA);

    const progress = await getLearningProgress(packA);

    expect(progress?.syncStatus).toBe("synced");
  });

  it("does nothing when synchronizing a missing record", async () => {
    await expect(
      markLearningProgressSynced(packA),
    ).resolves.toBeUndefined();

    expect(await getLearningProgress(packA)).toBeUndefined();
  });
});

// =====================================
// DELETE LEARNING PROGRESS
// =====================================

describe("Delete learning progress", () => {
  it("deletes progress for a specific pack", async () => {
    await startLearning(packA, 5);

    await deleteLearningProgress(packA);

    expect(await getLearningProgress(packA)).toBeUndefined();
  });

  it("does not delete progress belonging to another pack", async () => {
    await startLearning(packA, 5);
    await startLearning(packB, 3);

    await deleteLearningProgress(packA);

    expect(await getLearningProgress(packA)).toBeUndefined();
    expect(await getLearningProgress(packB)).toBeDefined();
  });

  it("rejects invalid pack IDs", async () => {
    await expect(deleteLearningProgress("invalid-id")).rejects.toThrow(
      "Invalid knowledge pack ID.",
    );
  });
});