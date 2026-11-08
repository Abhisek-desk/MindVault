import { z } from "zod";

const expectedVersionSchema = z
  .number()
  .int()
  .min(1, "Expected version must be at least 1")
  .optional();

const noteSyncSchema = z.object({
  entityType: z.literal("note"),

  entityId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid note ID"),

  operation: z.enum(["create", "update", "delete"]),

  clientMutationId: z.string().uuid(),

  expectedVersion: expectedVersionSchema,

  data: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      content: z.string().optional(),
      folderId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid folder ID")
        .nullable()
        .optional(),
    })
    .optional(),
});

const folderSyncSchema = z.object({
  entityType: z.literal("folder"),

  entityId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid folder ID"),

  operation: z.enum(["create", "update", "delete"]),

  clientMutationId: z.string().uuid(),

  expectedVersion: expectedVersionSchema,

  data: z
    .object({
      name: z.string().trim().min(1).max(50).optional(),
      color: z.string().optional(),
    })
    .optional(),
});

export const pushSyncSchema = z
  .object({
    changes: z
      .array(
        z.discriminatedUnion("entityType", [
          noteSyncSchema,
          folderSyncSchema,
        ]),
      )
      .min(1)
      .max(50),
  })
  .superRefine((value, context) => {
    value.changes.forEach((change, index) => {
      if (
        (change.operation === "update" ||
          change.operation === "delete") &&
        change.expectedVersion === undefined
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["changes", index, "expectedVersion"],
          message: `Expected version is required for ${change.operation} operations`,
        });
      }
    });
  });

export const pullSyncQuerySchema = z.object({
  cursor: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid sync cursor")
    .optional(),

  limit: z.coerce.number().int().min(1).max(100).default(50),
});