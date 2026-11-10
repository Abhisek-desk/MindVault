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
      content: z
        .string()
        .max(20000, "Note content cannot exceed 20,000 characters")
        .optional(),
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
      color: z
        .string()
        .regex(
          /^#[0-9A-Fa-f]{6}$/,
          "Color must be a valid six-digit hexadecimal color",
        )
        .optional(),
    })
    .optional(),
});

export const pushSyncSchema = z
  .object({
    changes: z
      .array(
        z.discriminatedUnion("entityType", [noteSyncSchema, folderSyncSchema]),
      )
      .min(1)
      .max(50),
  })
  .superRefine((value, context) => {
    const seenMutationIds = new Set<string>();

    value.changes.forEach((change, index) => {
      // Prevent duplicate mutation IDs within the same batch.
      const normalizedMutationId = change.clientMutationId.toLowerCase();

      if (seenMutationIds.has(normalizedMutationId)) {
        context.addIssue({
          code: "custom",
          path: ["changes", index, "clientMutationId"],
          message: "Duplicate clientMutationId in synchronization batch",
        });
      } else {
        seenMutationIds.add(normalizedMutationId);
      }

      // Require expectedVersion for updates and deletions.
      if (
        (change.operation === "update" || change.operation === "delete") &&
        change.expectedVersion === undefined
      ) {
        context.addIssue({
          code: "custom",
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
