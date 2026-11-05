import { Request, Response } from "express";
import mongoose from "mongoose";

import { LearningProgress } from "./learning.model";
import { KnowledgePack } from "../knowledge-packs/knowledge-pack.model";

import {
  learningPackIdSchema,
  updateLearningProgressSchema
} from "./learning.validation";

// Start or retrieve a learning path
export const startLearning = async (
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

    const validation = learningPackIdSchema.safeParse({
      packId: req.params.packId
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid Knowledge Pack ID"
      });
      return;
    }

    const pack = await KnowledgePack.findOne({
      _id: validation.data.packId,
      isPublished: true
    });

    if (!pack) {
      res.status(404).json({
        success: false,
        message: "Knowledge Pack not found"
      });
      return;
    }

    const progress = await LearningProgress.findOneAndUpdate(
      {
        userId,
        knowledgePackId: pack._id
      },
      {
        $setOnInsert: {
          userId,
          knowledgePackId: pack._id,
          completedTopics: [],
          totalTopics: 0,
          progressPercentage: 0,
          status: "not-started",
          startedAt: new Date()
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      message: "Learning path started successfully",
      progress
    });
  } catch (error) {
    console.error("Start learning error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to start learning path"
    });
  }
};

// Get learning progress for one Knowledge Pack
export const getLearningProgress = async (
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

    const validation = learningPackIdSchema.safeParse({
      packId: req.params.packId
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid Knowledge Pack ID"
      });
      return;
    }

    const progress = await LearningProgress.findOne({
      userId,
      knowledgePackId: validation.data.packId
    }).populate(
      "knowledgePackId",
      "title description category language coverImage"
    );

    if (!progress) {
      res.status(404).json({
        success: false,
        message: "Learning progress not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      progress
    });
  } catch (error) {
    console.error("Get learning progress error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve learning progress"
    });
  }
};

// Get all learning paths for the logged-in user
export const getAllLearningProgress = async (
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

    const progress = await LearningProgress.find({ userId })
      .populate(
        "knowledgePackId",
        "title description category language coverImage"
      )
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: progress.length,
      progress
    });
  } catch (error) {
    console.error("Get all learning progress error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve learning paths"
    });
  }
};

// Update completed topics and calculate progress
export const updateLearningProgress = async (
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

    const idValidation = learningPackIdSchema.safeParse({
      packId: req.params.packId
    });

    if (!idValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid Knowledge Pack ID"
      });
      return;
    }

    const bodyValidation = updateLearningProgressSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid learning progress data",
        errors: bodyValidation.error.issues
      });
      return;
    }

    const { completedTopics, totalTopics } = bodyValidation.data;

    if (completedTopics.length > totalTopics) {
      res.status(400).json({
        success: false,
        message: "Completed topics cannot exceed total topics"
      });
      return;
    }

    const uniqueTopics = [...new Set(completedTopics)];

    if (uniqueTopics.length !== completedTopics.length) {
      res.status(400).json({
        success: false,
        message: "Duplicate completed topics are not allowed"
      });
      return;
    }

    const pack = await KnowledgePack.findOne({
      _id: idValidation.data.packId,
      isPublished: true
    });

    if (!pack) {
      res.status(404).json({
        success: false,
        message: "Knowledge Pack not found"
      });
      return;
    }

    const progressPercentage = Math.round(
      (uniqueTopics.length / totalTopics) * 100
    );

    const isCompleted = progressPercentage === 100;

    const progress = await LearningProgress.findOneAndUpdate(
      {
        userId,
        knowledgePackId: pack._id
      },
      {
        $set: {
          completedTopics: uniqueTopics,
          totalTopics,
          progressPercentage,
          status: isCompleted ? "completed" : "in-progress",
          completedAt: isCompleted ? new Date() : null
        },
        $setOnInsert: {
          startedAt: new Date()
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      message: "Learning progress updated successfully",
      progress
    });
  } catch (error) {
    console.error("Update learning progress error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update learning progress"
    });
  }
};