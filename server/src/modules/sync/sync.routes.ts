import { Router } from "express";

import { protect } from "../../middleware/auth.middleware";

import {
  pushSyncChanges,
  pullSyncChanges
} from "./sync.controller";

const router = Router();

router.use(protect);

router.post("/push", pushSyncChanges);
router.get("/pull", pullSyncChanges);

export default router;