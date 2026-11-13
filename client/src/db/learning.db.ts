import {
  db,
  withDatabaseLease,
  type LocalLearningProgress,
} from "./database";

// =====================================
// VALIDATION
// =====================================

const validatePackId = (packId: string): void => {
  if (
    typeof packId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(packId)
  ) {
    throw new Error("Invalid knowledge pack ID.");
  }
};

const validateLessonId = (lessonId: string): void => {
  if (
    typeof lessonId !== "string" ||
    !lessonId.trim() ||
    lessonId.length > 200
  ) {
    throw new Error("Invalid lesson ID.");
  }
};

const validateTotalTopics = (totalTopics: number): void => {
  if (
    !Number.isInteger(totalTopics) ||
    totalTopics < 1 ||
    totalTopics > 500
  ) {
    throw new Error("Invalid total lesson count.");
  }
};

const validateCompletedTopics = (
  completedTopics: string[],
): void => {
  if (
    !Array.isArray(completedTopics) ||
    completedTopics.length > 500
  ) {
    throw new Error("Invalid completed lessons.");
  }

  const uniqueTopics = new Set<string>();

  for (const topic of completedTopics) {
    validateLessonId(topic);

    if (uniqueTopics.has(topic)) {
      throw new Error("Duplicate completed lesson.");
    }

    uniqueTopics.add(topic);
  }
};

// =====================================
// CALCULATE PROGRESS
// =====================================

const calculateProgress = (
  completedCount: number,
  totalTopics: number,
): number => {
  if (totalTopics === 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((completedCount / totalTopics) * 100),
  );
};

// =====================================
// VALIDATE COMPLETE PROGRESS RECORD
// =====================================

const validateProgress = (
  progress: LocalLearningProgress,
): void => {
  validatePackId(progress.packId);

  validateCompletedTopics(progress.completedTopics);

  if (
    !Number.isInteger(progress.totalTopics) ||
    progress.totalTopics < 0 ||
    progress.totalTopics > 500
  ) {
    throw new Error("Invalid total lesson count.");
  }

  if (progress.completedTopics.length > progress.totalTopics) {
    throw new Error("Completed lessons exceed total lessons.");
  }

  if (
    !Number.isFinite(progress.progressPercentage) ||
    progress.progressPercentage < 0 ||
    progress.progressPercentage > 100
  ) {
    throw new Error("Invalid progress percentage.");
  }

  if (
    !["not-started", "in-progress", "completed"].includes(
      progress.status,
    )
  ) {
    throw new Error("Invalid learning status.");
  }

  if (
    typeof progress.startedAt !== "string" ||
    Number.isNaN(Date.parse(progress.startedAt))
  ) {
    throw new Error("Invalid learning start date.");
  }

  if (
    typeof progress.updatedAt !== "string" ||
    Number.isNaN(Date.parse(progress.updatedAt))
  ) {
    throw new Error("Invalid learning update date.");
  }

  if (
    progress.lastLessonId !== null &&
    (typeof progress.lastLessonId !== "string" ||
      progress.lastLessonId.length > 200)
  ) {
    throw new Error("Invalid last lesson ID.");
  }

  if (
    progress.syncStatus !== "synced" &&
    progress.syncStatus !== "pending"
  ) {
    throw new Error("Invalid synchronization status.");
  }
};

// =====================================
// GET PROGRESS FOR ONE PACK
// =====================================

export const getLearningProgress = async (
  packId: string,
): Promise<LocalLearningProgress | undefined> => {
  validatePackId(packId);

  return withDatabaseLease(async () => {
    return db.learningProgress.get(packId);
  });
};

// =====================================
// GET ALL LEARNING PROGRESS
// =====================================

export const getAllLearningProgress = async (): Promise<
  LocalLearningProgress[]
> => {
  return withDatabaseLease(async () => {
    return db.learningProgress
      .orderBy("updatedAt")
      .reverse()
      .toArray();
  });
};

// =====================================
// SAVE LEARNING PROGRESS
// =====================================

export const saveLearningProgress = async (
  progress: LocalLearningProgress,
): Promise<void> => {
  validateProgress(progress);

  await withDatabaseLease(async () => {
    await db.learningProgress.put(progress);
  });
};

// =====================================
// START LEARNING
// =====================================

export const startLearning = async (
  packId: string,
  totalTopics: number,
): Promise<LocalLearningProgress> => {
  validatePackId(packId);
  validateTotalTopics(totalTopics);

  return withDatabaseLease(async () => {
    const existing = await db.learningProgress.get(packId);

    if (existing) {
      // Preserve existing progress when restarting.
      const updated: LocalLearningProgress = {
        ...existing,
        totalTopics,
        progressPercentage: calculateProgress(
          existing.completedTopics.length,
          totalTopics,
        ),
        status:
          existing.completedTopics.length >= totalTopics
            ? "completed"
            : existing.completedTopics.length > 0
              ? "in-progress"
              : "not-started",
        updatedAt: new Date().toISOString(),
      };

      validateProgress(updated);

      await db.learningProgress.put(updated);

      return updated;
    }

    const now = new Date().toISOString();

    const progress: LocalLearningProgress = {
      packId,
      completedTopics: [],
      totalTopics,
      progressPercentage: 0,
      status: "not-started",
      startedAt: now,
      updatedAt: now,
      lastLessonId: null,
      syncStatus: "pending",
    };

    validateProgress(progress);

    await db.learningProgress.put(progress);

    return progress;
  });
};

// =====================================
// UPDATE LESSON COMPLETION
// =====================================

export const updateLessonProgress = async (
  packId: string,
  lessonId: string,
  totalTopics: number,
  completed: boolean,
): Promise<LocalLearningProgress> => {
  validatePackId(packId);
  validateLessonId(lessonId);
  validateTotalTopics(totalTopics);

  if (typeof completed !== "boolean") {
    throw new Error("Invalid lesson completion value.");
  }

  return withDatabaseLease(async () => {
    const existing = await db.learningProgress.get(packId);

    const completedTopics = new Set(
      existing?.completedTopics ?? [],
    );

    if (completed) {
      completedTopics.add(lessonId);
    } else {
      completedTopics.delete(lessonId);
    }

    if (completedTopics.size > totalTopics) {
      throw new Error("Completed lessons exceed total lessons.");
    }

    const completedList = Array.from(completedTopics);

    const percentage = calculateProgress(
      completedList.length,
      totalTopics,
    );

    const now = new Date().toISOString();

    const progress: LocalLearningProgress = {
      packId,
      completedTopics: completedList,
      totalTopics,
      progressPercentage: percentage,
      status:
        percentage === 100
          ? "completed"
          : completedList.length > 0
            ? "in-progress"
            : "not-started",
      startedAt: existing?.startedAt ?? now,
      updatedAt: now,
      lastLessonId: lessonId,
      syncStatus: "pending",
    };

    validateProgress(progress);

    await db.learningProgress.put(progress);

    return progress;
  });
};

// =====================================
// MARK PROGRESS AS SYNCHRONIZED
// =====================================

export const markLearningProgressSynced = async (
  packId: string,
  expectedUpdatedAt?: string,
): Promise<void> => {
  validatePackId(packId);

  await withDatabaseLease(async () => {
    const existing = await db.learningProgress.get(packId);

    if (!existing) {
      return;
    }

    // Do not mark newer changes as synchronized.
    if (
      expectedUpdatedAt &&
      existing.updatedAt !== expectedUpdatedAt
    ) {
      return;
    }

    await db.learningProgress.put({
      ...existing,
      syncStatus: "synced",
    });
  });
};

// =====================================
// GET PENDING LEARNING PROGRESS
// =====================================

export const getPendingLearningProgress = async (): Promise<
  LocalLearningProgress[]
> => {
  return withDatabaseLease(async () => {
    return db.learningProgress
      .where("syncStatus")
      .equals("pending")
      .toArray();
  });
};

// =====================================
// DELETE LEARNING PROGRESS
// =====================================

export const deleteLearningProgress = async (
  packId: string,
): Promise<void> => {
  validatePackId(packId);

  await withDatabaseLease(async () => {
    await db.learningProgress.delete(packId);
  });
};