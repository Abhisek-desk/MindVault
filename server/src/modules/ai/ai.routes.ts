import { Router } from "express";

import {
  createConversation,
  getConversations,
  getConversationById,
  deleteConversation,
  sendMessage
} from "./ai.controller";

import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

router.post("/conversations", createConversation);

router.get("/conversations", getConversations);

router.get("/conversations/:id", getConversationById);

router.delete("/conversations/:id", deleteConversation);

router.post("/conversations/:id/messages", sendMessage);

export default router;