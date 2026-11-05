import mongoose, { Schema, Document } from "mongoose";

export interface ILearningProgress extends Document {
  userId: mongoose.Types.ObjectId;
  knowledgePackId: mongoose.Types.ObjectId;
  completedTopics: string[];
  progressPercentage: number;
  status: "not-started" | "in-progress" | "completed";
  startedAt?: Date;
  completedAt?: Date;
  totalTopics: number;
}

const learningProgressSchema = new Schema<ILearningProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    knowledgePackId: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgePack",
      required: true,
    },

    completedTopics: {
      type: [String],
      default: [],
    },
    totalTopics: {
      type: Number,
      default: 0,
      min: 0,
      max: 500,
    },

    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["not-started", "in-progress", "completed"],
      default: "not-started",
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// One learning progress record per user and Knowledge Pack.
learningProgressSchema.index(
  { userId: 1, knowledgePackId: 1 },
  { unique: true },
);

export const LearningProgress = mongoose.model<ILearningProgress>(
  "LearningProgress",
  learningProgressSchema,
);
