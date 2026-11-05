import { z } from "zod";

export const conversationIdSchema = z.object({
  id: z.string().regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid conversation ID"
  )
});

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(150).optional()
});
export const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(10000)
});