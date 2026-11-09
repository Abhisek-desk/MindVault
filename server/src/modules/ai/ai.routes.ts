import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  createConversation,
  getConversations,
  getConversationById,
  deleteConversation,
  sendMessage
} from "./ai.controller";

import { protect } from "../../middleware/auth.middleware";

const router = Router();

// AI message generation rate limit.
const aiMessageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,

  // Avoid interfering with automated integration tests.
  skip: () => process.env.NODE_ENV === "test",

  message: {
    success: false,
    message: "Too many AI requests. Please try again in 15 minutes."
  }
});

// All AI routes require authentication.
router.use(protect);

router.post("/conversations", createConversation);

router.get("/conversations", getConversations);

router.get("/conversations/:id", getConversationById);

router.delete("/conversations/:id", deleteConversation);

// Apply rate limiting specifically to AI message generation.
router.post(
  "/conversations/:id/messages",
  aiMessageLimiter,
  sendMessage
);

export default router;  