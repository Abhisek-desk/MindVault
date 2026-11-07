import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  folderId?: mongoose.Types.ObjectId | null;
  title: string;
  content: string;
  embedding?: number[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    folderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    content: {
      type: String,
      default: "",
    },

    embedding: {
      type: [Number],
      default: undefined,
      select: false,
    },

    // Optimistic concurrency control.
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  },
);

noteSchema.index({ userId: 1, folderId: 1 });

export const Note = mongoose.model<INote>("Note", noteSchema);