import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApiRequest } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  apiRequest: mockApiRequest,
}));

import {
  startRemoteLearning,
  getRemoteLearningProgress,
  getAllRemoteLearningProgress,
  updateRemoteLearningProgress,
} from "./learning-api.service";

// =====================================
// TEST DATA
// =====================================

const PACK_ID = "507f1f77bcf86cd799439011";
const SECOND_PACK_ID = "507f191e810c19729de860ea";

const NOW = "2026-01-01T10:00:00.000Z";

const createProgress = (
  overrides: Record<string, unknown> = {},
) => ({
  knowledgePackId: PACK_ID,
  completedTopics: ["lesson-1.md"],
  totalTopics: 5,
  progressPercentage: 20,
  status: "in-progress",
  startedAt: NOW,
  completedAt: null,
  updatedAt: NOW,
  ...overrides,
});

// =====================================
// SETUP
// =====================================

beforeEach(() => {
  vi.clearAllMocks();
});

// =====================================
// START LEARNING
// =====================================

describe("startRemoteLearning", () => {
  it("starts learning and returns validated progress", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      progress: createProgress(),
    });

    const result = await startRemoteLearning(PACK_ID);

    expect(result.packId).toBe(PACK_ID);
    expect(result.completedTopics).toEqual(["lesson-1.md"]);
    expect(result.progressPercentage).toBe(20);

    expect(mockApiRequest).toHaveBeenCalledWith(
      `/learning/${PACK_ID}/start`,
      {
        method: "POST",
      },
    );
  });

  it("rejects invalid pack IDs without making a request", async () => {
    await expect(
      startRemoteLearning("invalid-id"),
    ).rejects.toThrow("Invalid knowledge pack ID.");

    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects unsuccessful API responses", async () => {
    mockApiRequest.mockResolvedValue({
      success: false,
      progress: createProgress(),
    });

    await expect(
      startRemoteLearning(PACK_ID),
    ).rejects.toThrow("Invalid learning API response.");
  });

  it("rejects missing progress data", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
    });

    await expect(
      startRemoteLearning(PACK_ID),
    ).rejects.toThrow("Invalid learning API response.");
  });
});

// =====================================
// GET SINGLE PROGRESS
// =====================================

describe("getRemoteLearningProgress", () => {
  it("retrieves progress for a knowledge pack", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      progress: createProgress(),
    });

    const result = await getRemoteLearningProgress(PACK_ID);

    expect(result.packId).toBe(PACK_ID);

    expect(mockApiRequest).toHaveBeenCalledWith(
      `/learning/${PACK_ID}`,
    );
  });

  it("supports populated knowledge pack objects", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      progress: createProgress({
        knowledgePackId: {
          _id: PACK_ID,
          title: "JavaScript",
        },
      }),
    });

    const result = await getRemoteLearningProgress(PACK_ID);

    expect(result.packId).toBe(PACK_ID);
  });

  it("supports knowledge pack IDs using the id property", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      progress: createProgress({
        knowledgePackId: {
          id: PACK_ID,
        },
      }),
    });

    const result = await getRemoteLearningProgress(PACK_ID);

    expect(result.packId).toBe(PACK_ID);
  });

  it("rejects invalid pack IDs", async () => {
    await expect(
      getRemoteLearningProgress("invalid"),
    ).rejects.toThrow("Invalid knowledge pack ID.");

    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

// =====================================
// GET ALL PROGRESS
// =====================================

describe("getAllRemoteLearningProgress", () => {
  it("retrieves all learning progress records", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      count: 2,
      progress: [
        createProgress(),
        createProgress({
          knowledgePackId: SECOND_PACK_ID,
          completedTopics: [],
          totalTopics: 3,
          progressPercentage: 0,
          status: "not-started",
        }),
      ],
    });

    const result = await getAllRemoteLearningProgress();

    expect(result).toHaveLength(2);
    expect(result[0].packId).toBe(PACK_ID);
    expect(result[1].packId).toBe(SECOND_PACK_ID);

    expect(mockApiRequest).toHaveBeenCalledWith("/learning");
  });

  it("accepts an empty progress list", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      count: 0,
      progress: [],
    });

    await expect(
      getAllRemoteLearningProgress(),
    ).resolves.toEqual([]);
  });

  it("rejects unsuccessful responses", async () => {
    mockApiRequest.mockResolvedValue({
      success: false,
      count: 0,
      progress: [],
    });

    await expect(
      getAllRemoteLearningProgress(),
    ).rejects.toThrow("Invalid learning list response.");
  });

  it("rejects duplicate progress records", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      count: 2,
      progress: [
        createProgress(),
        createProgress(),
      ],
    });

    await expect(
      getAllRemoteLearningProgress(),
    ).rejects.toThrow(
      "Duplicate learning progress records.",
    );
  });

  it("rejects invalid progress records", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      count: 1,
      progress: [
        createProgress({
          progressPercentage: 150,
        }),
      ],
    });

    await expect(
      getAllRemoteLearningProgress(),
    ).rejects.toThrow(
      "Invalid learning progress response.",
    );
  });
});

// =====================================
// UPDATE PROGRESS
// =====================================

describe("updateRemoteLearningProgress", () => {
  it("updates progress using a PUT request", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      progress: createProgress({
        completedTopics: [
          "lesson-1.md",
          "lesson-2.md",
        ],
        totalTopics: 5,
        progressPercentage: 40,
      }),
    });

    const result = await updateRemoteLearningProgress(
      PACK_ID,
      ["lesson-1.md", "lesson-2.md"],
      5,
    );

    expect(result.progressPercentage).toBe(40);

    expect(mockApiRequest).toHaveBeenCalledWith(
      `/learning/${PACK_ID}`,
      {
        method: "PUT",
        body: {
          completedTopics: [
            "lesson-1.md",
            "lesson-2.md",
          ],
          totalTopics: 5,
        },
      },
    );
  });

  it("rejects invalid pack IDs", async () => {
    await expect(
      updateRemoteLearningProgress(
        "invalid",
        [],
        5,
      ),
    ).rejects.toThrow("Invalid knowledge pack ID.");

    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects empty lesson IDs", async () => {
    await expect(
      updateRemoteLearningProgress(
        PACK_ID,
        [""],
        5,
      ),
    ).rejects.toThrow("Invalid completed lessons.");
  });

  it("rejects whitespace-only lesson IDs", async () => {
    await expect(
      updateRemoteLearningProgress(
        PACK_ID,
        ["   "],
        5,
      ),
    ).rejects.toThrow("Invalid completed lessons.");
  });

  it("rejects duplicate completed lessons", async () => {
    await expect(
      updateRemoteLearningProgress(
        PACK_ID,
        ["lesson-1.md", "lesson-1.md"],
        5,
      ),
    ).rejects.toThrow("Invalid completed lessons.");
  });

  it("rejects more than 500 completed lessons", async () => {
    const lessons = Array.from(
      { length: 501 },
      (_, index) => `lesson-${index}.md`,
    );

    await expect(
      updateRemoteLearningProgress(
        PACK_ID,
        lessons,
        501,
      ),
    ).rejects.toThrow("Invalid completed lessons.");
  });

  it("rejects invalid total lesson counts", async () => {
    await expect(
      updateRemoteLearningProgress(
        PACK_ID,
        [],
        0,
      ),
    ).rejects.toThrow("Invalid total lesson count.");

    await expect(
      updateRemoteLearningProgress(
        PACK_ID,
        [],
        501,
      ),
    ).rejects.toThrow("Invalid total lesson count.");
  });

  it("rejects more completed lessons than the total", async () => {
    await expect(
      updateRemoteLearningProgress(
        PACK_ID,
        ["lesson-1.md", "lesson-2.md"],
        1,
      ),
    ).rejects.toThrow("Invalid total lesson count.");
  });

  it("does not send requests for invalid input", async () => {
    await expect(
      updateRemoteLearningProgress(
        PACK_ID,
        ["lesson-1.md", "lesson-1.md"],
        5,
      ),
    ).rejects.toThrow();

    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});