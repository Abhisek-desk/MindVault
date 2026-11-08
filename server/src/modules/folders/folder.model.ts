import mongoose, { Schema, Document } from "mongoose";

export interface IFolder extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  version: number;
  membershipRevision: number;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    color: {
      type: String,
      default: "#F47768",
    },

    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Internal concurrency field.
    // Updated when notes enter this folder or when deletion
    // checks whether the folder is empty.
    membershipRevision: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate folder names for the same user.
folderSchema.index(
  { userId: 1, name: 1 },
  { unique: true },
);

export const Folder = mongoose.model<IFolder>(
  "Folder",
  folderSchema,
);