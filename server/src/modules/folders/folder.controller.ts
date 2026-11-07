import { Request, Response } from "express";
import mongoose from "mongoose";

import { Folder } from "./folder.model";
import { Note } from "../notes/note.model";
import { recordSyncChange } from "../sync/sync.service";

// ========================================
// CREATE FOLDER
// ========================================

export const createFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    const userId = req.userId;
    const { name, color } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 50
    ) {
      res.status(400).json({
        success: false,
        message: "A valid folder name is required (maximum 50 characters)"
      });
      return;
    }

    if (
      color !== undefined &&
      (
        typeof color !== "string" ||
        !/^#[0-9A-Fa-f]{6}$/.test(color)
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid hex color"
      });
      return;
    }

    let createdFolder: InstanceType<typeof Folder> | null = null;

    await session.withTransaction(async () => {
      const [folder] = await Folder.create(
        [{
          userId,
          name: name.trim(),
          color: color || "#F47768"
        }],
        { session }
      );

      await recordSyncChange(
        {
          userId,
          entityType: "folder",
          entityId: folder._id.toString(),
          operation: "create",
          data: {
            name: folder.name,
            color: folder.color,
            createdAt: folder.createdAt.toISOString(),
            updatedAt: folder.updatedAt.toISOString()
          }
        },
        session
      );

      createdFolder = folder;
    });

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      folder: createdFolder
    });

  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "A folder with this name already exists"
      });
      return;
    }

    console.error("Create folder error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create folder"
    });

  } finally {
    await session.endSession();
  }
};


// ========================================
// GET ALL FOLDERS
// ========================================

export const getFolders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const folders = await Folder.find({
      userId
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: folders.length,
      folders
    });

  } catch (error) {
    console.error("Get folders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch folders"
    });
  }
};


// ========================================
// UPDATE FOLDER
// ========================================

export const updateFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    const userId = req.userId;
    const { id } = req.params;
    const { name, color } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid folder ID"
      });
      return;
    }

    const updates: {
      name?: string;
      color?: string;
    } = {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 50
      ) {
        res.status(400).json({
          success: false,
          message: "Folder name cannot be empty or exceed 50 characters"
        });
        return;
      }

      updates.name = name.trim();
    }

    if (color !== undefined) {
      if (
        typeof color !== "string" ||
        !/^#[0-9A-Fa-f]{6}$/.test(color)
      ) {
        res.status(400).json({
          success: false,
          message: "Please provide a valid hex color"
        });
        return;
      }

      updates.color = color;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid updates provided"
      });
      return;
    }

    let updatedFolder: InstanceType<typeof Folder> | null = null;

    await session.withTransaction(async () => {
      const folder = await Folder.findOneAndUpdate(
        {
          _id: id,
          userId
        },
        updates,
        {
          new: true,
          runValidators: true,
          session
        }
      );

      if (!folder) {
        throw new Error("FOLDER_NOT_FOUND");
      }

      await recordSyncChange(
        {
          userId,
          entityType: "folder",
          entityId: folder._id.toString(),
          operation: "update",
          data: {
            name: folder.name,
            color: folder.color,
            createdAt: folder.createdAt.toISOString(),
            updatedAt: folder.updatedAt.toISOString()
          }
        },
        session
      );

      updatedFolder = folder;
    });

    res.status(200).json({
      success: true,
      message: "Folder updated successfully",
      folder: updatedFolder
    });

  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "";

    if (errorMessage === "FOLDER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Folder not found"
      });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "A folder with this name already exists"
      });
      return;
    }

    console.error("Update folder error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update folder"
    });

  } finally {
    await session.endSession();
  }
};


// ========================================
// DELETE FOLDER
// ========================================

export const deleteFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid folder ID"
      });
      return;
    }

    await session.withTransaction(async () => {
      const folder = await Folder.findOne({
        _id: id,
        userId
      }).session(session);

      if (!folder) {
        throw new Error("FOLDER_NOT_FOUND");
      }

      const hasNotes = await Note.exists({
        userId,
        folderId: id
      }).session(session);

      if (hasNotes) {
        throw new Error("FOLDER_NOT_EMPTY");
      }

      await Folder.deleteOne(
        {
          _id: id,
          userId
        },
        { session }
      );

      await recordSyncChange(
        {
          userId,
          entityType: "folder",
          entityId: folder._id.toString(),
          operation: "delete",
          data: {
            name: folder.name,
            deletedAt: new Date().toISOString()
          }
        },
        session
      );
    });

    res.status(200).json({
      success: true,
      message: "Folder deleted successfully"
    });

  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "";

    if (errorMessage === "FOLDER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Folder not found"
      });
      return;
    }

    if (errorMessage === "FOLDER_NOT_EMPTY") {
      res.status(409).json({
        success: false,
        message: "Move or remove the notes in this folder before deleting it"
      });
      return;
    }

    console.error("Delete folder error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete folder"
    });

  } finally {
    await session.endSession();
  }
};