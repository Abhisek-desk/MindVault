import { Request, Response } from "express";
import mongoose from "mongoose";

import { Folder } from "./folder.model";
import { Note } from "../notes/note.model";

// CREATE FOLDER
export const createFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    const { name, color } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Folder name is required"
      });
      return;
    }

    const folder = await Folder.create({
      userId,
      name: name.trim(),
      color: color || "#F47768"
    });

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      folder
    });

  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "A folder with this name already exists"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to create folder"
    });
  }
};


// GET ALL FOLDERS
export const getFolders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const folders = await Folder.find({
      userId: req.userId
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: folders.length,
      folders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch folders"
    });
  }
};


// UPDATE FOLDER
export const updateFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid folder ID"
      });
      return;
    }

    const updates: { name?: string; color?: string } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({
          success: false,
          message: "Folder name cannot be empty"
        });
        return;
      }

      if (name.trim().length > 50) {
        res.status(400).json({
          success: false,
          message: "Folder name cannot exceed 50 characters"
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

    const folder = await Folder.findOneAndUpdate(
      {
        _id: id,
        userId: req.userId
      },
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!folder) {
      res.status(404).json({
        success: false,
        message: "Folder not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Folder updated successfully",
      folder
    });

  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "A folder with this name already exists"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to update folder"
    });
  }
};


// DELETE FOLDER
export const deleteFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid folder ID"
      });
      return;
    }

    const folder = await Folder.findOne({
      _id: id,
      userId: req.userId
    });

    if (!folder) {
      res.status(404).json({
        success: false,
        message: "Folder not found"
      });
      return;
    }

    const hasNotes = await Note.exists({
      userId: req.userId,
      folderId: id
    });

    if (hasNotes) {
      res.status(409).json({
        success: false,
        message: "Move or remove the notes in this folder before deleting it"
      });
      return;
    }

    await folder.deleteOne();

    res.status(200).json({
      success: true,
      message: "Folder deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete folder"
    });
  }
};