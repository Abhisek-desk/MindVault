import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledgePack extends Document {
  title: string;
  description: string;
  category: string;
  language: string;
  version: string;
  coverImage?: string;
  downloadUrl: string;
  fileSizeBytes: number;
  tags: string[];
  isPublished: boolean;
}

const knowledgePackSchema = new Schema<IKnowledgePack>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    language: {
      type: String,
      required: true,
      default: "en",
    },

    version: {
      type: String,
      default: "1.0.0",
    },

    coverImage: {
      type: String,
      default: null,
    },

    downloadUrl: {
      type: String,
      required: true,
    },

    fileSizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },

    tags: {
      type: [String],
      default: [],
    },

    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

knowledgePackSchema.index({
  title: "text",
  description: "text",
  tags: "text",
});

knowledgePackSchema.index({
  category: 1,
  language: 1,
  isPublished: 1,
});

export const KnowledgePack = mongoose.model<IKnowledgePack>(
  "KnowledgePack",
  knowledgePackSchema,
);
