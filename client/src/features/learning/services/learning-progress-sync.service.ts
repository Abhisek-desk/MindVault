import {
  getPendingLearningProgress,
  markLearningProgressSynced,
} from "../../../db/learning.db";

import {
  startRemoteLearning,
  updateRemoteLearningProgress,
} from "./learning-api.service";

// =====================================
// PREVENT DUPLICATE SYNC OPERATIONS
// =====================================

let syncInProgress = false;

// =====================================
// SYNC LEARNING PROGRESS
// =====================================

export const syncLearningProgress = async (): Promise<void> => {
  if (syncInProgress || !navigator.onLine) {
    return;
  }

  syncInProgress = true;

  try {
    const pending = await getPendingLearningProgress();

    for (const progress of pending) {
      if (!navigator.onLine) {
        break;
      }

      try {
        // Ensure a learning path exists on the server.
        await startRemoteLearning(progress.packId);

        // Upload the locally stored progress.
        await updateRemoteLearningProgress(
          progress.packId,
          progress.completedTopics,
          progress.totalTopics,
        );

        // Mark as synchronized only if it has not changed
        // while the network request was in progress.
        await markLearningProgressSynced(
          progress.packId,
          progress.updatedAt,
        );
      } catch {
        // Preserve pending progress for the next retry.
        if (import.meta.env.DEV) {
          console.warn("Learning progress synchronization postponed.");
        }
      }
    }
  } finally {
    syncInProgress = false;
  }
};