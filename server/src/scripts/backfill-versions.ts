import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

import { Note } from "../modules/notes/note.model";
import { Folder } from "../modules/folders/folder.model";

// Load environment variables
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const backfillVersions = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");

    // Find notes without a version
    const notesBefore = await Note.countDocuments({
      $or: [
        { version: { $exists: false } },
        { version: null },
      ],
    });

    // Find folders without a version
    const foldersBefore = await Folder.countDocuments({
      $or: [
        { version: { $exists: false } },
        { version: null },
      ],
    });

    console.log(`Notes requiring migration: ${notesBefore}`);
    console.log(`Folders requiring migration: ${foldersBefore}`);

    // Backfill notes
    const noteResult = await Note.updateMany(
      {
        $or: [
          { version: { $exists: false } },
          { version: null },
        ],
      },
      {
        $set: { version: 1 },
      }
    );

    // Backfill folders
    const folderResult = await Folder.updateMany(
      {
        $or: [
          { version: { $exists: false } },
          { version: null },
        ],
      },
      {
        $set: { version: 1 },
      }
    );

    console.log("\n========== VERSION MIGRATION SUMMARY ==========");
    console.log(`Notes updated: ${noteResult.modifiedCount}`);
    console.log(`Folders updated: ${folderResult.modifiedCount}`);
    console.log("Default version assigned: 1");
    console.log("================================================");

  } catch (error) {
    console.error("Version migration failed:", error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

backfillVersions();