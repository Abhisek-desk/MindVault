import { Request, Response } from "express";
import mongoose from "mongoose";

import { Note } from "./note.model";
import { Folder } from "../folders/folder.model";
import { generateEmbedding } from "../ai/embedding.service";
import { recordSyncChange } from "../sync/sync.service";

// ========================================
// CREATE NOTE
// ========================================

export const createNote = async (
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

    const { title, content, folderId } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200
    ) {
      res.status(400).json({
        success: false,
        message: "A valid note title is required",
      });
      return;
    }

    if (content !== undefined && typeof content !== "string") {
      res.status(400).json({
        success: false,
        message: "Note content must be text",
      });
      return;
    }

    if (folderId !== undefined && folderId !== null) {
      if (!mongoose.isValidObjectId(folderId)) {
        res.status(400).json({
          success: false,
          message: "Invalid folder ID",
        });
        return;
      }
    }

    let embedding: number[] | undefined;

    try {
      embedding = await generateEmbedding(
        `${title.trim()}\n${content ?? ""}`,
      );
    } catch (error) {
      console.error("Note embedding generation failed:", error);
    }

    let createdNote: InstanceType<typeof Note> | null = null;

    await session.withTransaction(async () => {
      // Coordinate note creation with folder deletion.
      if (folderId) {
        const folder = await Folder.findOneAndUpdate(
          {
            _id: folderId,
            userId,
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

        if (!folder) {
          throw new Error("FOLDER_NOT_FOUND");
        }
      }

      const [note] = await Note.create(
        [
          {
            userId,
            title: title.trim(),
            content: content ?? "",
            folderId: folderId ?? null,
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
          data: {
            title: note.title,
            content: note.content,
            folderId: note.folderId?.toString() ?? null,
            version: note.version,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
          },
        },
        session,
      );

      createdNote = note;
    });

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      note: createdNote,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FOLDER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Folder not found",
      });
      return;
    }

    console.error("Create note error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create note",
    });
  } finally {
    await session.endSession();
  }
};

// ========================================
// GET NOTES
// ========================================

export const getNotes = async (
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

    const filter: {
      userId: string;
      folderId?: mongoose.Types.ObjectId | null;
    } = {
      userId,
    };

    const folderId = req.query.folderId;

    if (typeof folderId === "string") {
      if (folderId === "none") {
        filter.folderId = null;
      } else {
        if (!mongoose.isValidObjectId(folderId)) {
          res.status(400).json({
            success: false,
            message: "Invalid folder ID",
          });
          return;
        }

        filter.folderId = new mongoose.Types.ObjectId(folderId);
      }
    }

    const notes = await Note.find(filter).sort({
      updatedAt: -1,
    });

    res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error("Get notes error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch notes",
    });
  }
};

// ========================================
// UPDATE NOTE
// ========================================

export const updateNote = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    const userId = req.userId;
    const { id } = req.params;

    const {
      title,
      content,
      folderId,
      expectedVersion,
    } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
      return;
    }

    if (
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 1
    ) {
      res.status(400).json({
        success: false,
        message: "A valid expectedVersion is required",
      });
      return;
    }

    const updates: {
      title?: string;
      content?: string;
      folderId?: mongoose.Types.ObjectId | null;
      embedding?: number[];
    } = {};

    if (title !== undefined) {
      if (
        typeof title !== "string" ||
        !title.trim() ||
        title.trim().length > 200
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid note title",
        });
        return;
      }

      updates.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== "string") {
        res.status(400).json({
          success: false,
          message: "Note content must be text",
        });
        return;
      }

      updates.content = content;
    }

    let targetFolderId: mongoose.Types.ObjectId | null | undefined;

    if (folderId !== undefined) {
      if (folderId === null) {
        targetFolderId = null;
      } else {
        if (
          typeof folderId !== "string" ||
          !mongoose.isValidObjectId(folderId)
        ) {
          res.status(400).json({
            success: false,
            message: "Invalid folder ID",
          });
          return;
        }

        targetFolderId = new mongoose.Types.ObjectId(folderId);
      }

      updates.folderId = targetFolderId;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: "No updates provided",
      });
      return;
    }

    const existingNote = await Note.findOne({
      _id: id,
      userId,
    });

    if (!existingNote) {
      res.status(404).json({
        success: false,
        message: "Note not found",
      });
      return;
    }

    if (
      updates.title !== undefined ||
      updates.content !== undefined
    ) {
      const finalTitle = updates.title ?? existingNote.title;
      const finalContent = updates.content ?? existingNote.content;

      try {
        updates.embedding = await generateEmbedding(
          `${finalTitle}\n${finalContent}`,
        );
      } catch (error) {
        console.error(
          "Updated note embedding generation failed:",
          error,
        );
      }
    }

    let updatedNote: InstanceType<typeof Note> | null = null;

    await session.withTransaction(async () => {
      // Re-read the note inside the transaction.
      const currentNote = await Note.findOne({
        _id: id,
        userId,
      }).session(session);

      if (!currentNote) {
        throw new Error("NOTE_NOT_FOUND");
      }

      if (currentNote.version !== expectedVersion) {
        throw new Error("NOTE_VERSION_CONFLICT");
      }

      const oldFolderId = currentNote.folderId?.toString() ?? null;
      const newFolderId =
        targetFolderId === undefined
          ? oldFolderId
          : targetFolderId?.toString() ?? null;

      // Only coordinate folders when membership changes.
      if (oldFolderId !== newFolderId) {
        const folderIds = [
          oldFolderId,
          newFolderId,
        ]
          .filter((value): value is string => value !== null)
          .sort();

        for (const folderIdToUpdate of folderIds) {
          const folder = await Folder.findOneAndUpdate(
            {
              _id: folderIdToUpdate,
              userId,
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

          if (!folder) {
            throw new Error(
              folderIdToUpdate === newFolderId
                ? "FOLDER_NOT_FOUND"
                : "NOTE_FOLDER_NOT_FOUND",
            );
          }
        }
      }

      updatedNote = await Note.findOneAndUpdate(
        {
          _id: id,
          userId,
          version: expectedVersion,
        },
        {
          $set: updates,
          $inc: {
            version: 1,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!updatedNote) {
        throw new Error("NOTE_VERSION_CONFLICT");
      }

      await recordSyncChange(
        {
          userId,
          entityType: "note",
          entityId: updatedNote._id.toString(),
          operation: "update",
          data: {
            title: updatedNote.title,
            content: updatedNote.content,
            folderId: updatedNote.folderId?.toString() ?? null,
            version: updatedNote.version,
            createdAt: updatedNote.createdAt.toISOString(),
            updatedAt: updatedNote.updatedAt.toISOString(),
          },
        },
        session,
      );
    });

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      note: updatedNote,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "";

    if (
      errorMessage === "NOTE_NOT_FOUND" ||
      errorMessage === "NOTE_FOLDER_NOT_FOUND"
    ) {
      res.status(404).json({
        success: false,
        message:
          errorMessage === "NOTE_NOT_FOUND"
            ? "Note not found"
            : "The note's current folder no longer exists",
      });
      return;
    }

    if (errorMessage === "FOLDER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Target folder not found",
      });
      return;
    }

    if (errorMessage === "NOTE_VERSION_CONFLICT") {
      res.status(409).json({
        success: false,
        message:
          "Note was modified by another device. Please sync and resolve the conflict.",
      });
      return;
    }

    console.error("Update note error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update note",
    });
  } finally {
    await session.endSession();
  }
};

// ========================================
// DELETE NOTE
// ========================================

export const deleteNote = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    const userId = req.userId;
    const { id } = req.params;
    const { expectedVersion } = req.body ?? {};

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
      return;
    }

    // Validate expected version.
    if (
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 1
    ) {
      res.status(400).json({
        success: false,
        message: "A valid expectedVersion is required",
      });
      return;
    }

    await session.withTransaction(async () => {
      // Delete only if the version matches.
      const note = await Note.findOneAndDelete(
        {
          _id: id,
          userId,
          version: expectedVersion,
        },
        { session },
      );

      if (!note) {
        const currentNote = await Note.findOne({
          _id: id,
          userId,
        }).session(session);

        if (!currentNote) {
          throw new Error("NOTE_NOT_FOUND");
        }

        throw new Error("NOTE_VERSION_CONFLICT");
      }

      // Preserve deleted note version in the sync tombstone.
      await recordSyncChange(
        {
          userId,
          entityType: "note",
          entityId: note._id.toString(),
          operation: "delete",
          data: {
            title: note.title,
            version: note.version,
            deletedAt: new Date().toISOString(),
          },
        },
        session,
      );
    });

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOTE_NOT_FOUND") {
        res.status(404).json({
          success: false,
          message: "Note not found",
        });
        return;
      }

      if (error.message === "NOTE_VERSION_CONFLICT") {
        res.status(409).json({
          success: false,
          message:
            "Note was modified by another device. Please sync and resolve the conflict.",
        });
        return;
      }
    }

    console.error("Delete note error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete note",
    });
  } finally {
    await session.endSession();
  }
};