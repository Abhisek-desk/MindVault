import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  folderId?: mongoose.Types.ObjectId | null;
  title: string;
  content: string;
}

const noteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    folderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    content: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

noteSchema.index({ userId: 1, folderId: 1 });

export const Note = mongoose.model<INote>("Note", noteSchema);