import { Router } from "express";

import {
  createFolder,
  getFolders,
  updateFolder,
  deleteFolder
} from "./folder.controller";

import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

router.post("/", createFolder);
router.get("/", getFolders);
router.put("/:id", updateFolder);
router.delete("/:id", deleteFolder);

export default router;