import mongoose, { Schema, Document } from "mongoose";

export interface IDownload extends Document {
  userId: mongoose.Types.ObjectId;
  knowledgePackId: mongoose.Types.ObjectId;
  version: string;
  status: "pending" | "completed" | "failed";
  downloadedAt?: Date;
}

const downloadSchema = new Schema<IDownload>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    knowledgePackId: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgePack",
      required: true
    },

    version: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    },

    downloadedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// A user can have only one download record per pack.
downloadSchema.index(
  { userId: 1, knowledgePackId: 1 },
  { unique: true }
);

export const Download = mongoose.model<IDownload>(
  "Download",
  downloadSchema
);