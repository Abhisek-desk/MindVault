import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

import { Note } from "../modules/notes/note.model";
import { generateEmbedding } from "../modules/ai/embedding.service";

// Load environment variables
dotenv.config({
  path: path.resolve(process.cwd(), ".env")
});

const backfillNoteEmbeddings = async (): Promise<void> => {
  try {
    // Check MongoDB configuration
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");

    // Find notes without embeddings
    const notes = await Note.find({
      $or: [
        { embedding: { $exists: false } },
        { embedding: null },
        { embedding: { $size: 0 } }
      ]
    })
      .select("_id title content")
      .lean();

    console.log(`Found ${notes.length} notes requiring embeddings.`);

    let successful = 0;
    let failed = 0;

    // Process notes one at a time
    for (const note of notes) {
      try {
        console.log(`Processing: ${note.title}`);

        const embedding = await generateEmbedding(
          `${note.title}\n${note.content}`
        );

        await Note.updateOne(
          { _id: note._id },
          {
            $set: {
              embedding
            }
          }
        );

        successful++;

        console.log(
          `Embedding saved successfully (${successful}/${notes.length}).`
        );

      } catch (error) {
        failed++;

        console.error(
          `Failed to generate embedding for "${note.title}":`,
          error
        );
      }
    }

    console.log("\n========== BACKFILL SUMMARY ==========");
    console.log(`Total notes found: ${notes.length}`);
    console.log(`Successfully processed: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log("======================================");

  } catch (error) {
    console.error("Backfill service failed:", error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

backfillNoteEmbeddings();