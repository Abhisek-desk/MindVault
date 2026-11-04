import dotenv from "dotenv";
import path from "path";

// Load .env from the server folder
const envPath = path.resolve(__dirname, "../.env");

const result = dotenv.config({
  path: envPath
});

if (result.error) {
  console.error("Could not load .env:", result.error);
} else {
  console.log(".env file loaded successfully");
}

import app from "./app";
import connectDB from "./config/database";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("Environment check:", {
      accessSecret: Boolean(process.env.JWT_ACCESS_SECRET),
      refreshSecret: Boolean(process.env.JWT_REFRESH_SECRET),
      mongoUri: Boolean(process.env.MONGODB_URI)
    });

    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error("JWT_ACCESS_SECRET is missing");
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT_REFRESH_SECRET is missing");
    }

    await connectDB();

    app.listen(PORT, () => {
      console.log(`Mind Vault running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

startServer();