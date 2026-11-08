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

    // Check folder ownership.
    if (folderId !== undefined && folderId !== null) {
      if (!mongoose.isValidObjectId(folderId)) {
        res.status(400).json({
          success: false,
          message: "Invalid folder ID",
        });
        return;
      }

      const folder = await Folder.findOne({
        _id: folderId,
        userId,
      });

      if (!folder) {
        res.status(404).json({
          success: false,
          message: "Folder not found",
        });
        return;
      }
    }

    // Generate note embedding.
    let embedding: number[] | undefined;

    try {
      embedding = await generateEmbedding(
        `${title.trim()}\n${content ?? ""}`,
      );
    } catch (error) {
      console.error("Note embedding generation failed:", error);
    }

    await session.withTransaction(async () => {
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

      res.status(201).json({
        success: true,
        message: "Note created successfully",
        note,
      });
    });
  } catch (error) {
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

    const updates: {
      title?: string;
      content?: string;
      folderId?: mongoose.Types.ObjectId | null;
      embedding?: number[];
    } = {};

    // Validate title.
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

    // Validate content.
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

    // Validate folder.
    if (folderId !== undefined) {
      if (folderId === null) {
        updates.folderId = null;
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

        const folder = await Folder.findOne({
          _id: folderId,
          userId,
        });

        if (!folder) {
          res.status(404).json({
            success: false,
            message: "Folder not found",
          });
          return;
        }

        updates.folderId = new mongoose.Types.ObjectId(folderId);
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: "No updates provided",
      });
      return;
    }

    // Retrieve existing note.
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

    // Regenerate embedding when title or content changes.
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

        // Keep the existing embedding if generation fails.
      }
    }

    let updatedNote: typeof existingNote | null = null;

    await session.withTransaction(async () => {
      // Atomic optimistic concurrency check.
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
        const currentNote = await Note.findOne({
          _id: id,
          userId,
        }).session(session);

        if (!currentNote) {
          throw new Error("NOTE_NOT_FOUND");
        }

        throw new Error("NOTE_VERSION_CONFLICT");
      }

      // Record version-aware sync event.
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