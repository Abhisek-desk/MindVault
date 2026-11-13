import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  mockGetPendingLearningProgress,
  mockMarkLearningProgressSynced,
  mockStartRemoteLearning,
  mockUpdateRemoteLearningProgress,
} = vi.hoisted(() => ({
  mockGetPendingLearningProgress: vi.fn(),
  mockMarkLearningProgressSynced: vi.fn(),
  mockStartRemoteLearning: vi.fn(),
  mockUpdateRemoteLearningProgress: vi.fn(),
}));

vi.mock("../../../db/learning.db", () => ({
  getPendingLearningProgress:
    mockGetPendingLearningProgress,

  markLearningProgressSynced:
    mockMarkLearningProgressSynced,
}));

vi.mock("./learning-api.service", () => ({
  startRemoteLearning: mockStartRemoteLearning,

  updateRemoteLearningProgress:
    mockUpdateRemoteLearningProgress,
}));

import { syncLearningProgress } from "./learning-progress-sync.service";

// =====================================
// TEST DATA
// =====================================

const PACK_ID = "507f1f77bcf86cd799439011";

const UPDATED_AT = "2026-01-01T10:00:00.000Z";

const createPendingProgress = (
  overrides: Record<string, unknown> = {},
) => ({
  packId: PACK_ID,
  completedTopics: ["lesson-1.md"],
  totalTopics: 5,
  progressPercentage: 20,
  status: "in-progress" as const,
  startedAt: UPDATED_AT,
  updatedAt: UPDATED_AT,
  lastLessonId: "lesson-1.md",
  syncStatus: "pending" as const,
  ...overrides,
});

// =====================================
// SETUP
// =====================================

beforeEach(() => {
  vi.clearAllMocks();

  vi.stubGlobal("navigator", {
    onLine: true,
  });

  mockGetPendingLearningProgress.mockResolvedValue([
    createPendingProgress(),
  ]);

  mockStartRemoteLearning.mockResolvedValue({});
  mockUpdateRemoteLearningProgress.mockResolvedValue({});
  mockMarkLearningProgressSynced.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// =====================================
// SUCCESSFUL SYNCHRONIZATION
// =====================================

describe("syncLearningProgress", () => {
  it("synchronizes pending progress successfully", async () => {
    await syncLearningProgress();

    expect(
      mockGetPendingLearningProgress,
    ).toHaveBeenCalledOnce();

    expect(mockStartRemoteLearning).toHaveBeenCalledWith(
      PACK_ID,
    );

    expect(
      mockUpdateRemoteLearningProgress,
    ).toHaveBeenCalledWith(
      PACK_ID,
      ["lesson-1.md"],
      5,
    );

    expect(
      mockMarkLearningProgressSynced,
    ).toHaveBeenCalledWith(
      PACK_ID,
      UPDATED_AT,
    );
  });

  it("does not synchronize when offline", async () => {
    vi.stubGlobal("navigator", {
      onLine: false,
    });

    await syncLearningProgress();

    expect(
      mockGetPendingLearningProgress,
    ).not.toHaveBeenCalled();

    expect(mockStartRemoteLearning).not.toHaveBeenCalled();

    expect(
      mockUpdateRemoteLearningProgress,
    ).not.toHaveBeenCalled();
  });

  it("does nothing when there are no pending records", async () => {
    mockGetPendingLearningProgress.mockResolvedValue([]);

    await syncLearningProgress();

    expect(mockStartRemoteLearning).not.toHaveBeenCalled();

    expect(
      mockUpdateRemoteLearningProgress,
    ).not.toHaveBeenCalled();

    expect(
      mockMarkLearningProgressSynced,
    ).not.toHaveBeenCalled();
  });

  it("continues with other records when one record fails", async () => {
    const secondPackId = "507f191e810c19729de860ea";

    mockGetPendingLearningProgress.mockResolvedValue([
      createPendingProgress(),
      createPendingProgress({
        packId: secondPackId,
        completedTopics: ["intro.md"],
      }),
    ]);

    mockStartRemoteLearning
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({});

    await syncLearningProgress();

    expect(mockStartRemoteLearning).toHaveBeenCalledTimes(2);

    expect(
      mockUpdateRemoteLearningProgress,
    ).toHaveBeenCalledTimes(1);

    expect(
      mockUpdateRemoteLearningProgress,
    ).toHaveBeenCalledWith(
      secondPackId,
      ["intro.md"],
      5,
    );

    expect(
      mockMarkLearningProgressSynced,
    ).toHaveBeenCalledTimes(1);

    expect(
      mockMarkLearningProgressSynced,
    ).toHaveBeenCalledWith(
      secondPackId,
      UPDATED_AT,
    );
  });

  it("preserves pending progress when remote start fails", async () => {
    mockStartRemoteLearning.mockRejectedValue(
      new Error("Server unavailable"),
    );

    await syncLearningProgress();

    expect(
      mockUpdateRemoteLearningProgress,
    ).not.toHaveBeenCalled();

    expect(
      mockMarkLearningProgressSynced,
    ).not.toHaveBeenCalled();
  });

  it("preserves pending progress when remote update fails", async () => {
    mockUpdateRemoteLearningProgress.mockRejectedValue(
      new Error("Update failed"),
    );

    await syncLearningProgress();

    expect(mockStartRemoteLearning).toHaveBeenCalledOnce();

    expect(
      mockMarkLearningProgressSynced,
    ).not.toHaveBeenCalled();
  });

  it("continues processing after a synchronization failure", async () => {
    const secondPackId = "507f191e810c19729de860ea";

    mockGetPendingLearningProgress.mockResolvedValue([
      createPendingProgress(),
      createPendingProgress({
        packId: secondPackId,
      }),
    ]);

    mockUpdateRemoteLearningProgress
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({});

    await syncLearningProgress();

    expect(
      mockUpdateRemoteLearningProgress,
    ).toHaveBeenCalledTimes(2);

    expect(
      mockMarkLearningProgressSynced,
    ).toHaveBeenCalledTimes(1);

    expect(
      mockMarkLearningProgressSynced,
    ).toHaveBeenCalledWith(
      secondPackId,
      UPDATED_AT,
    );
  });

  it("stops processing when the connection goes offline", async () => {
    const secondPackId = "507f191e810c19729de860ea";

    mockGetPendingLearningProgress.mockResolvedValue([
      createPendingProgress(),
      createPendingProgress({
        packId: secondPackId,
      }),
    ]);

    mockMarkLearningProgressSynced.mockImplementation(
      async () => {
        vi.stubGlobal("navigator", {
          onLine: false,
        });
      },
    );

    await syncLearningProgress();

    expect(mockStartRemoteLearning).toHaveBeenCalledTimes(1);

    expect(
      mockUpdateRemoteLearningProgress,
    ).toHaveBeenCalledTimes(1);
  });

  it("prevents simultaneous synchronization operations", async () => {
    let releaseRequest!: () => void;

    const requestPending = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });

    mockGetPendingLearningProgress.mockImplementation(
      async () => {
        await requestPending;

        return [createPendingProgress()];
      },
    );

    const firstSync = syncLearningProgress();
    const secondSync = syncLearningProgress();

    await Promise.resolve();

    expect(
      mockGetPendingLearningProgress,
    ).toHaveBeenCalledOnce();

    releaseRequest();

    await Promise.all([firstSync, secondSync]);

    expect(mockStartRemoteLearning).toHaveBeenCalledOnce();
  });

  it("allows another synchronization after the previous one finishes", async () => {
    await syncLearningProgress();

    vi.clearAllMocks();

    mockGetPendingLearningProgress.mockResolvedValue([]);

    await syncLearningProgress();

    expect(
      mockGetPendingLearningProgress,
    ).toHaveBeenCalledOnce();
  });
});