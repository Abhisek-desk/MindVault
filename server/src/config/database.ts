import mongoose from "mongoose";
import { SyncChange } from "../modules/sync/sync.model";

const connectDB = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGODB_URI as string
    );

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );

    // Ensure synchronization indexes exist in MongoDB.
    await SyncChange.createIndexes();

    console.log("Synchronization indexes verified successfully");
  } catch (error) {
    console.error("MongoDB connection or index initialization failed:", error);
    process.exit(1);
  }
};

export default connectDB;