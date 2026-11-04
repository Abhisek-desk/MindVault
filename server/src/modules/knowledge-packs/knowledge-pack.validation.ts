import { z } from "zod";

export const getKnowledgePacksSchema = z.object({
  category: z.string().optional(),
  language: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const knowledgePackIdSchema = z.object({
  id: z
    .string()
    .refine(
      (value) => /^[0-9a-fA-F]{24}$/.test(value),
      "Invalid Knowledge Pack ID",
    ),
});
