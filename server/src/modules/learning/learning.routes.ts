import { Router } from "express";

import {
  startLearning,
  getLearningProgress,
  getAllLearningProgress,
  updateLearningProgress
} from "./learning.controller";

import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

router.get("/", getAllLearningProgress);

router.post("/:packId/start", startLearning);

router.get("/:packId", getLearningProgress);

router.put("/:packId", updateLearningProgress);

export default router;