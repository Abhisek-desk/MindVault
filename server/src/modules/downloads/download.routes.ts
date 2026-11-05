import { Router } from "express";

import {
  createDownload,
  getDownloads,
  completeDownload,
  deleteDownload
} from "./download.controller";

import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

router.get("/", getDownloads);

router.post("/:packId", createDownload);

router.patch("/:packId/complete", completeDownload);

router.delete("/:packId", deleteDownload);

export default router;