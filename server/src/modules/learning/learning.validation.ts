import { z } from "zod";

export const learningPackIdSchema = z.object({
  packId: z.string().regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid Knowledge Pack ID"
  )
});

export const updateLearningProgressSchema = z.object({
  completedTopics: z
    .array(z.string().trim().min(1).max(200))
    .max(500),

  totalTopics: z
    .number()
    .int()
    .min(1)
    .max(500)
});