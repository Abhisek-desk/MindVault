import { Request, Response } from "express";
import mongoose from "mongoose";

import { Note } from "./note.model";
import { Folder } from "../folders/folder.model";
import { generateEmbedding } from "../ai/embedding.service";

// ========================================
// CREATE NOTE
// ========================================

export const createNote = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
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

    // Check folder ownership
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
        userId: req.userId,
      });

      if (!folder) {
        res.status(404).json({
          success: false,
          message: "Folder not found",
        });
        return;
      }
    }

    let embedding: number[] | undefined;

    try {
      embedding = await generateEmbedding(`${title.trim()}\n${content ?? ""}`);
    } catch (error) {
      console.error("Note embedding generation failed:", error);
    }

    const note = await Note.create({
      userId: req.userId,
      title: title.trim(),
      content: content ?? "",
      folderId: folderId ?? null,
      ...(embedding ? { embedding } : {}),
    });

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      note,
    });
  } catch (error) {
    console.error("Create note error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create note",
    });
  }
};

// ========================================
// GET NOTES
// ========================================

export const getNotes = async (req: Request, res: Response): Promise<void> => {
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

    const notes = await Note.find(filter).sort({ updatedAt: -1 });

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
  try {
    const { id } = req.params;
    const { title, content, folderId } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid note ID",
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
          userId: req.userId,
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

    // Regenerate embedding when title or content changes.
    if (updates.title !== undefined || updates.content !== undefined) {
      const existingNote = await Note.findOne({
        _id: id,
        userId: req.userId,
      });

      if (!existingNote) {
        res.status(404).json({
          success: false,
          message: "Note not found",
        });
        return;
      }

      const finalTitle = updates.title ?? existingNote.title;
      const finalContent = updates.content ?? existingNote.content;

      try {
        updates.embedding = await generateEmbedding(
          `${finalTitle}\n${finalContent}`,
        );
      } catch (error) {
        console.error("Updated note embedding generation failed:", error);

        // Clear the outdated embedding if generation fails.
        updates.embedding = [];
      }
    }

    const note = await Note.findOneAndUpdate(
      {
        _id: id,
        userId: req.userId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!note) {
      res.status(404).json({
        success: false,
        message: "Note not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    console.error("Update note error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update note",
    });
  }
};

// ========================================
// DELETE NOTE
// ========================================

export const deleteNote = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
      return;
    }

    const note = await Note.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!note) {
      res.status(404).json({
        success: false,
        message: "Note not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Delete note error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete note",
    });
  }
};
