import { z } from "zod";

export const conversationIdSchema = z
  .object({
    id: z
      .string()
      .regex(
        /^[0-9a-fA-F]{24}$/,
        "Invalid conversation ID"
      )
  })
  .strict();

export const createConversationSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Conversation title cannot be empty")
      .max(150, "Conversation title cannot exceed 150 characters")
      .optional()
  })
  .strict();

export const sendMessageSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Message cannot be empty")
      .max(10000, "Message cannot exceed 10,000 characters")
  })
  .strict();