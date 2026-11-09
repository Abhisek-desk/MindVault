import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledgePack extends Document {
  title: string;
  description: string;
  category: string;
  language: string;
  version: string;
  coverImage?: string | null;
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
      maxlength: 100,
    },

    language: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      default: "en",
    },

    version: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "1.0.0",
    },

    coverImage: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },

    downloadUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (value: string): boolean => {
          try {
            const url = new URL(value);

            return (
              url.protocol === "http:" ||
              url.protocol === "https:"
            );
          } catch {
            return false;
          }
        },
        message: "Download URL must be a valid HTTP or HTTPS URL.",
      },
    },

    fileSizeBytes: {
      type: Number,
      required: true,
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
      validate: {
        validator: Number.isSafeInteger,
        message: "File size must be a valid non-negative integer.",
      },
    },

    tags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 50,
        },
      ],
      default: [],
      validate: {
        validator: (tags: string[]): boolean =>
          tags.length <= 20,
        message: "A knowledge pack cannot have more than 20 tags.",
      },
    },

    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
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
  knowledgePackSchema
);