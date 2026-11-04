import { Router } from "express";

import {
  getKnowledgePacks,
  getKnowledgePackById
} from "./knowledge-pack.controller";

const router = Router();

router.get("/", getKnowledgePacks);
router.get("/:id", getKnowledgePackById);

export default router;