import { Request, Response } from "express";
import mongoose from "mongoose";

import { Download } from "./download.model";
import { KnowledgePack } from "../knowledge-packs/knowledge-pack.model";

// Register a Knowledge Pack download
export const createDownload = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    const { packId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    if (!mongoose.isValidObjectId(packId)) {
      res.status(400).json({
        success: false,
        message: "Invalid Knowledge Pack ID"
      });
      return;
    }

    const pack = await KnowledgePack.findOne({
      _id: packId,
      isPublished: true
    });

    if (!pack) {
      res.status(404).json({
        success: false,
        message: "Knowledge Pack not found"
      });
      return;
    }

    const download = await Download.findOneAndUpdate(
      { userId, knowledgePackId: packId },
      {
        $set: {
          version: pack.version,
          status: "pending",
          downloadedAt: null
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(201).json({
      success: true,
      message: "Download registered successfully",
      download
    });
  } catch (error) {
    console.error("Create download error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to register download"
    });
  }
};

// Get all downloads belonging to the logged-in user
export const getDownloads = async (
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

    const downloads = await Download.find({ userId })
      .populate({
        path: "knowledgePackId",
        select: "title description category language version coverImage fileSizeBytes"
      })
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: downloads.length,
      downloads
    });
  } catch (error) {
    console.error("Get downloads error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch downloads"
    });
  }
};

// Mark a download as completed
export const completeDownload = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    const { packId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    if (!mongoose.isValidObjectId(packId)) {
      res.status(400).json({
        success: false,
        message: "Invalid Knowledge Pack ID"
      });
      return;
    }

    const download = await Download.findOneAndUpdate(
      { userId, knowledgePackId: packId },
      {
        $set: {
          status: "completed",
          downloadedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!download) {
      res.status(404).json({
        success: false,
        message: "Download record not found. Register the download first."
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Download marked as completed",
      download
    });
  } catch (error) {
    console.error("Complete download error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to complete download"
    });
  }
};

// Remove a download record
export const deleteDownload = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    const { packId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    if (!mongoose.isValidObjectId(packId)) {
      res.status(400).json({
        success: false,
        message: "Invalid Knowledge Pack ID"
      });
      return;
    }

    const download = await Download.findOneAndDelete({
      userId,
      knowledgePackId: packId
    });

    if (!download) {
      res.status(404).json({
        success: false,
        message: "Download record not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Download record removed successfully"
    });
  } catch (error) {
    console.error("Delete download error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove download"
    });
  }
};