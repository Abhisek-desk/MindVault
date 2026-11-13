import { apiRequest } from "../../../services/api";

// =====================================
// TYPES
// =====================================

export interface RemoteLearningProgress {
  packId: string;
  completedTopics: string[];
  totalTopics: number;
  progressPercentage: number;
  status: "not-started" | "in-progress" | "completed";
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

interface LearningApiResponse {
  success: boolean;
  message?: string;
  progress?: unknown;
}

interface LearningListApiResponse {
  success: boolean;
  count: number;
  progress: unknown[];
}

// =====================================
// VALIDATION
// =====================================

const isValidPackId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-fA-F0-9]{24}$/.test(value);

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidStatus = (
  value: unknown,
): value is RemoteLearningProgress["status"] =>
  value === "not-started" ||
  value === "in-progress" ||
  value === "completed";

const isValidDate = (value: unknown): value is string =>
  typeof value === "string" &&
  !Number.isNaN(Date.parse(value));

const extractPackId = (value: unknown): string | null => {
  if (typeof value === "string" && isValidPackId(value)) {
    return value;
  }

  if (isRecord(value)) {
    const id = value._id ?? value.id;

    if (isValidPackId(id)) {
      return id;
    }
  }

  return null;
};

// =====================================
// PARSE PROGRESS
// =====================================

const parseLearningProgress = (
  value: unknown,
): RemoteLearningProgress => {
  if (!isRecord(value)) {
    throw new Error("Invalid learning progress response.");
  }

  const packId = extractPackId(
    value.knowledgePackId ?? value.packId,
  );

  const completedTopics = value.completedTopics;
  const totalTopics = value.totalTopics;
  const progressPercentage = value.progressPercentage;
  const status = value.status;
  const startedAt = value.startedAt;

  const rawCompletedAt = value.completedAt;
  const rawUpdatedAt = value.updatedAt ?? value.startedAt;

  const completedAt: string | null =
    rawCompletedAt === null || rawCompletedAt === undefined
      ? null
      : typeof rawCompletedAt === "string"
        ? rawCompletedAt
        : "";

  if (
    !packId ||
    !Array.isArray(completedTopics) ||
    completedTopics.length > 500 ||
    !completedTopics.every(
      (topic) =>
        typeof topic === "string" &&
        topic.length > 0 &&
        topic.length <= 200,
    ) ||
    new Set(completedTopics).size !== completedTopics.length ||
    !Number.isInteger(totalTopics) ||
    (totalTopics as number) < 0 ||
    (totalTopics as number) > 500 ||
    !Number.isFinite(progressPercentage) ||
    (progressPercentage as number) < 0 ||
    (progressPercentage as number) > 100 ||
    !isValidStatus(status) ||
    !isValidDate(startedAt) ||
    !isValidDate(rawUpdatedAt) ||
    (completedAt !== null && !isValidDate(completedAt))
  ) {
    throw new Error("Invalid learning progress response.");
  }

  return {
    packId,
    completedTopics: [...completedTopics] as string[],
    totalTopics: totalTopics as number,
    progressPercentage: progressPercentage as number,
    status,
    startedAt,
    completedAt,
    updatedAt: rawUpdatedAt,
  };
};

// =====================================
// RESPONSE VALIDATION
// =====================================

const parseSingleProgress = (
  response: LearningApiResponse,
): RemoteLearningProgress => {
  if (
    !isRecord(response) ||
    response.success !== true ||
    !("progress" in response)
  ) {
    throw new Error("Invalid learning API response.");
  }

  return parseLearningProgress(response.progress);
};

// =====================================
// START LEARNING
// =====================================

export const startRemoteLearning = async (
  packId: string,
): Promise<RemoteLearningProgress> => {
  if (!isValidPackId(packId)) {
    throw new Error("Invalid knowledge pack ID.");
  }

  const response = await apiRequest<LearningApiResponse>(
    `/learning/${packId}/start`,
    {
      method: "POST",
    },
  );

  return parseSingleProgress(response);
};

// =====================================
// GET SINGLE PROGRESS
// =====================================

export const getRemoteLearningProgress = async (
  packId: string,
): Promise<RemoteLearningProgress> => {
  if (!isValidPackId(packId)) {
    throw new Error("Invalid knowledge pack ID.");
  }

  const response = await apiRequest<LearningApiResponse>(
    `/learning/${packId}`,
  );

  return parseSingleProgress(response);
};

// =====================================
// GET ALL PROGRESS
// =====================================

export const getAllRemoteLearningProgress = async (): Promise<
  RemoteLearningProgress[]
> => {
  const response = await apiRequest<LearningListApiResponse>(
    "/learning",
  );

  if (
    !isRecord(response) ||
    response.success !== true ||
    !Array.isArray(response.progress) ||
    response.progress.length > 10000
  ) {
    throw new Error("Invalid learning list response.");
  }

  const progress = response.progress.map(
    parseLearningProgress,
  );

  const packIds = progress.map((item) => item.packId);

  if (new Set(packIds).size !== packIds.length) {
    throw new Error("Duplicate learning progress records.");
  }

  return progress;
};

// =====================================
// UPDATE PROGRESS
// =====================================

export const updateRemoteLearningProgress = async (
  packId: string,
  completedTopics: string[],
  totalTopics: number,
): Promise<RemoteLearningProgress> => {
  if (!isValidPackId(packId)) {
    throw new Error("Invalid knowledge pack ID.");
  }

  if (
    !Array.isArray(completedTopics) ||
    completedTopics.length > 500 ||
    !completedTopics.every(
      (topic) =>
        typeof topic === "string" &&
        topic.trim().length > 0 &&
        topic.length <= 200,
    ) ||
    new Set(completedTopics).size !== completedTopics.length
  ) {
    throw new Error("Invalid completed lessons.");
  }

  if (
    !Number.isInteger(totalTopics) ||
    totalTopics < 1 ||
    totalTopics > 500 ||
    completedTopics.length > totalTopics
  ) {
    throw new Error("Invalid total lesson count.");
  }

  const response = await apiRequest<LearningApiResponse>(
    `/learning/${packId}`,
    {
      method: "PUT",
      body: {
        completedTopics,
        totalTopics,
      },
    },
  );

  return parseSingleProgress(response);
};