import { Request, Response } from "express";
import mongoose from "mongoose";

import { Note } from "../notes/note.model";
import { Folder } from "../folders/folder.model";
import { generateEmbedding } from "../ai/embedding.service";

import { SyncChange } from "./sync.model";
import { recordSyncChange } from "./sync.service";

import { pushSyncSchema, pullSyncQuerySchema } from "./sync.validation";

export const pushSyncChanges = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const validation = pushSyncSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid synchronization data",
        errors: validation.error.flatten(),
      });
      return;
    }

    const changes = validation.data.changes;

    // Prepare note embeddings before starting the transaction.
    const preparedChanges = await Promise.all(
      changes.map(async (change) => {
        if (
          change.entityType !== "note" ||
          change.operation === "delete" ||
          !change.data?.title
        ) {
          return {
            change,
            embedding: undefined,
          };
        }

        try {
          const embedding = await generateEmbedding(
            `${change.data.title}\n${change.data.content ?? ""}`,
          );

          return {
            change,
            embedding,
          };
        } catch (error) {
          console.error("Sync embedding generation failed:", error);

          return {
            change,
            embedding: undefined,
          };
        }
      }),
    );

    let processed = 0;
    let duplicates = 0;

    await session.withTransaction(async () => {
      for (const item of preparedChanges) {
        const { change, embedding } = item;

        // Prevent duplicate operations.
        const existingMutation = await SyncChange.findOne({
          userId,
          clientMutationId: change.clientMutationId,
        }).session(session);

        if (existingMutation) {
          duplicates++;
          continue;
        }

        // =====================================
        // NOTE SYNCHRONIZATION
        // =====================================

        if (change.entityType === "note") {
          // CREATE NOTE
          if (change.operation === "create") {
            if (!change.data?.title) {
              throw new Error("NOTE_TITLE_REQUIRED");
            }

            if (change.data.folderId) {
              const folder = await Folder.findOne({
                _id: change.data.folderId,
                userId,
              }).session(session);

              if (!folder) {
                throw new Error("FOLDER_NOT_FOUND");
              }
            }

            const existingNote = await Note.findById(change.entityId).session(
              session,
            );

            if (existingNote) {
              throw new Error("NOTE_ALREADY_EXISTS");
            }

            const [note] = await Note.create(
              [
                {
                  _id: new mongoose.Types.ObjectId(change.entityId),
                  userId,
                  title: change.data.title,
                  content: change.data.content ?? "",
                  folderId: change.data.folderId
                    ? new mongoose.Types.ObjectId(change.data.folderId)
                    : null,
                  version: 1,
                  ...(embedding ? { embedding } : {}),
                },
              ],
              { session },
            );

            await recordSyncChange(
              {
                userId,
                entityType: "note",
                entityId: note._id.toString(),
                operation: "create",
                clientMutationId: change.clientMutationId,
                data: {
                  title: note.title,
                  content: note.content,
                  folderId: note.folderId?.toString() ?? null,
                  version: note.version,
                },
              },
              session,
            );
          }

          // UPDATE NOTE
          else if (change.operation === "update") {
            if (!change.data || Object.keys(change.data).length === 0) {
              throw new Error("NOTE_UPDATE_DATA_REQUIRED");
            }

            if (change.expectedVersion === undefined) {
              throw new Error("NOTE_EXPECTED_VERSION_REQUIRED");
            }

            const existingNote = await Note.findOne({
              _id: change.entityId,
              userId,
            }).session(session);

            if (!existingNote) {
              throw new Error("NOTE_NOT_FOUND");
            }

            if (existingNote.version !== change.expectedVersion) {
              throw new Error("NOTE_VERSION_CONFLICT");
            }

            if (change.data.folderId) {
              const folder = await Folder.findOne({
                _id: change.data.folderId,
                userId,
              }).session(session);

              if (!folder) {
                throw new Error("FOLDER_NOT_FOUND");
              }
            }

            const updateFields: Record<string, unknown> = {};

            if (change.data.title !== undefined) {
              updateFields.title = change.data.title;
            }

            if (change.data.content !== undefined) {
              updateFields.content = change.data.content;
            }

            if (change.data.folderId !== undefined) {
              updateFields.folderId = change.data.folderId
                ? new mongoose.Types.ObjectId(change.data.folderId)
                : null;
            }

            if (
              change.data.title !== undefined ||
              change.data.content !== undefined
            ) {
              if (embedding) {
                updateFields.embedding = embedding;
              }
            }

            const note = await Note.findOneAndUpdate(
              {
                _id: change.entityId,
                userId,
                version: change.expectedVersion,
              },
              {
                $set: updateFields,
                $inc: { version: 1 },
              },
              {
                new: true,
                runValidators: true,
                session,
              },
            );

            if (!note) {
              throw new Error("NOTE_VERSION_CONFLICT");
            }

            await recordSyncChange(
              {
                userId,
                entityType: "note",
                entityId: note._id.toString(),
                operation: "update",
                clientMutationId: change.clientMutationId,
                data: {
                  title: note.title,
                  content: note.content,
                  folderId: note.folderId?.toString() ?? null,
                  version: note.version,
                },
              },
              session,
            );
          }

          // DELETE NOTE
          // DELETE FOLDER
          else if (change.operation === "delete") {
            if (change.expectedVersion === undefined) {
              throw new Error("FOLDER_EXPECTED_VERSION_REQUIRED");
            }

            const existingFolder = await Folder.findOne({
              _id: change.entityId,
              userId,
            }).session(session);

            if (!existingFolder) {
              throw new Error("FOLDER_NOT_FOUND");
            }

            if (existingFolder.version !== change.expectedVersion) {
              throw new Error("FOLDER_VERSION_CONFLICT");
            }

            // Acquire a write lock on the folder.
            // Note creation and movement use the same membershipRevision.
            const lockedFolder = await Folder.findOneAndUpdate(
              {
                _id: change.entityId,
                userId,
                version: change.expectedVersion,
              },
              {
                $inc: {
                  membershipRevision: 1,
                },
              },
              {
                new: true,
                session,
              },
            );

            if (!lockedFolder) {
              throw new Error("FOLDER_VERSION_CONFLICT");
            }

            // Check folder membership after acquiring the write lock.
            const notesInsideFolder = await Note.exists({
              userId,
              folderId: lockedFolder._id,
            }).session(session);

            if (notesInsideFolder) {
              throw new Error("FOLDER_NOT_EMPTY");
            }

            const folder = await Folder.findOneAndDelete(
              {
                _id: change.entityId,
                userId,
                version: change.expectedVersion,
                membershipRevision: lockedFolder.membershipRevision,
              },
              { session },
            );

            if (!folder) {
              throw new Error("FOLDER_VERSION_CONFLICT");
            }

            await recordSyncChange(
              {
                userId,
                entityType: "folder",
                entityId: change.entityId,
                operation: "delete",
                clientMutationId: change.clientMutationId,
                data: {
                  name: folder.name,
                  version: folder.version,
                  deletedAt: new Date().toISOString(),
                },
              },
              session,
            );
          }
        }

        // =====================================
        // FOLDER SYNCHRONIZATION
        // =====================================
        else if (change.entityType === "folder") {
          // CREATE FOLDER
          if (change.operation === "create") {
            if (!change.data?.name) {
              throw new Error("FOLDER_NAME_REQUIRED");
            }

            const existingFolder = await Folder.findById(
              change.entityId,
            ).session(session);

            if (existingFolder) {
              throw new Error("FOLDER_ALREADY_EXISTS");
            }

            const [folder] = await Folder.create(
              [
                {
                  _id: new mongoose.Types.ObjectId(change.entityId),
                  userId,
                  name: change.data.name,
                  color: change.data.color ?? "#F47768",
                  version: 1,
                },
              ],
              { session },
            );

            await recordSyncChange(
              {
                userId,
                entityType: "folder",
                entityId: folder._id.toString(),
                operation: "create",
                clientMutationId: change.clientMutationId,
                data: {
                  name: folder.name,
                  color: folder.color,
                  version: folder.version,
                },
              },
              session,
            );
          }

          // UPDATE FOLDER
          else if (change.operation === "update") {
            if (!change.data || Object.keys(change.data).length === 0) {
              throw new Error("FOLDER_UPDATE_DATA_REQUIRED");
            }

            if (change.expectedVersion === undefined) {
              throw new Error("FOLDER_EXPECTED_VERSION_REQUIRED");
            }

            const existingFolder = await Folder.findOne({
              _id: change.entityId,
              userId,
            }).session(session);

            if (!existingFolder) {
              throw new Error("FOLDER_NOT_FOUND");
            }

            if (existingFolder.version !== change.expectedVersion) {
              throw new Error("FOLDER_VERSION_CONFLICT");
            }

            const updateFields: Record<string, unknown> = {};

            if (change.data.name !== undefined) {
              updateFields.name = change.data.name;
            }

            if (change.data.color !== undefined) {
              updateFields.color = change.data.color;
            }

            const folder = await Folder.findOneAndUpdate(
              {
                _id: change.entityId,
                userId,
                version: change.expectedVersion,
              },
              {
                $set: updateFields,
                $inc: { version: 1 },
              },
              {
                new: true,
                runValidators: true,
                session,
              },
            );

            if (!folder) {
              throw new Error("FOLDER_VERSION_CONFLICT");
            }

            await recordSyncChange(
              {
                userId,
                entityType: "folder",
                entityId: folder._id.toString(),
                operation: "update",
                clientMutationId: change.clientMutationId,
                data: {
                  name: folder.name,
                  color: folder.color,
                  version: folder.version,
                },
              },
              session,
            );
          }

          // DELETE FOLDER
          else if (change.operation === "delete") {
            if (change.expectedVersion === undefined) {
              throw new Error("FOLDER_EXPECTED_VERSION_REQUIRED");
            }

            const existingFolder = await Folder.findOne({
              _id: change.entityId,
              userId,
            }).session(session);

            if (!existingFolder) {
              throw new Error("FOLDER_NOT_FOUND");
            }

            if (existingFolder.version !== change.expectedVersion) {
              throw new Error("FOLDER_VERSION_CONFLICT");
            }

            const notesInsideFolder = await Note.exists({
              userId,
              folderId: existingFolder._id,
            }).session(session);

            if (notesInsideFolder) {
              throw new Error("FOLDER_NOT_EMPTY");
            }

            const folder = await Folder.findOneAndDelete(
              {
                _id: change.entityId,
                userId,
                version: change.expectedVersion,
              },
              { session },
            );

            if (!folder) {
              throw new Error("FOLDER_VERSION_CONFLICT");
            }

            await recordSyncChange(
              {
                userId,
                entityType: "folder",
                entityId: change.entityId,
                operation: "delete",
                clientMutationId: change.clientMutationId,
                data: {
                  name: folder.name,
                  version: folder.version,
                  deletedAt: new Date().toISOString(),
                },
              },
              session,
            );
          }
        }

        processed++;
      }
    });

    res.status(200).json({
      success: true,
      message: "Synchronization completed successfully",
      processed,
      duplicates,
    });
  } catch (error) {
    console.error("Push sync error:", error);

    const errorMessage = error instanceof Error ? error.message : "";

    const knownErrors: Record<string, string> = {
      NOTE_TITLE_REQUIRED: "Note title is required",
      NOTE_UPDATE_DATA_REQUIRED: "Note update data is required",
      NOTE_NOT_FOUND: "Note not found",
      NOTE_ALREADY_EXISTS: "A note with this ID already exists",
      NOTE_EXPECTED_VERSION_REQUIRED: "Expected note version is required",
      NOTE_VERSION_CONFLICT:
        "This note has changed on the server. Synchronize before retrying",

      FOLDER_NOT_FOUND: "Folder not found",
      FOLDER_NAME_REQUIRED: "Folder name is required",
      FOLDER_UPDATE_DATA_REQUIRED: "Folder update data is required",
      FOLDER_ALREADY_EXISTS: "A folder with this ID already exists",
      FOLDER_NOT_EMPTY: "Delete or move the notes inside this folder first",
      FOLDER_EXPECTED_VERSION_REQUIRED: "Expected folder version is required",
      FOLDER_VERSION_CONFLICT:
        "This folder has changed on the server. Synchronize before retrying",
    };

    if (knownErrors[errorMessage]) {
      res.status(409).json({
        success: false,
        message: knownErrors[errorMessage],
      });
      return;
    }

    // MongoDB duplicate-key error, for example duplicate folder name.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "A folder with this name already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to synchronize changes",
    });
  } finally {
    await session.endSession();
  }
};

// =====================================
// PULL SYNCHRONIZATION
// =====================================

export const pullSyncChanges = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const validation = pullSyncQuerySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid synchronization cursor or limit",
        errors: validation.error.flatten(),
      });
      return;
    }

    const { cursor, limit } = validation.data;

    const filter: Record<string, unknown> = {
      userId,
    };

    if (cursor) {
      filter._id = {
        $gt: new mongoose.Types.ObjectId(cursor),
      };
    }

    const changes = await SyncChange.find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean();

    const hasMore = changes.length > limit;

    const results = hasMore ? changes.slice(0, limit) : changes;

    const nextCursor =
      results.length > 0
        ? results[results.length - 1]._id.toString()
        : (cursor ?? null);

    res.status(200).json({
      success: true,
      count: results.length,
      hasMore,
      nextCursor,
      changes: results.map((change) => ({
        id: change._id.toString(),
        entityType: change.entityType,
        entityId: change.entityId,
        operation: change.operation,
        data: change.data,
        clientMutationId: change.clientMutationId,
        createdAt: change.createdAt,
      })),
    });
  } catch (error) {
    console.error("Pull sync error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve synchronization changes",
    });
  }
};
