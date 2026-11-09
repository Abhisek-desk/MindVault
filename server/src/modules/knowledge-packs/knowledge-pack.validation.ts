import { z } from "zod";

export const getKnowledgePacksSchema = z.object({
  category: z.string().trim().max(100).optional(),

  language: z.string().trim().max(20).optional(),

  search: z.string().trim().max(200).optional(),

  page: z.coerce.number().int().min(1).max(1000000).default(1),

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
