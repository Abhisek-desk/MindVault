import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";

import authRoutes from "./modules/auth/auth.routes";
import noteRoutes from "./modules/notes/note.routes";
import folderRoutes from "./modules/folders/folder.routes";
import knowledgePackRoutes from "./modules/knowledge-packs/knowledge-pack.routes";
import downloadRoutes from "./modules/downloads/download.routes";
import learningRoutes from "./modules/learning/learning.routes";
import aiRoutes from "./modules/ai/ai.routes";
import syncRoutes from "./modules/sync/sync.routes";

const app = express();

// Security headers.
app.use(helmet());

// Restrict cross-origin requests.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Request parsing.
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Knowledge pack download directory.
const downloadsDirectory = path.resolve(
  __dirname,
  "../public/downloads"
);

// Secure knowledge pack downloads.
app.get("/downloads/:filename", (req, res, next) => {
  const filename = req.params.filename;

  // Only allow ZIP filenames containing safe characters.
  if (!/^[a-zA-Z0-9_-]+\.zip$/.test(filename)) {
    res.status(400).json({
      success: false,
      message: "Invalid download filename."
    });
    return;
  }

  res.sendFile(
    filename,
    {
      root: downloadsDirectory,
      dotfiles: "deny"
    },
    (error) => {
      if (error) {
        if (res.headersSent) {
          return;
        }

        if ("status" in error && error.status === 404) {
          res.status(404).json({
            success: false,
            message: "Knowledge pack not found."
          });
          return;
        }

        next(error);
      }
    }
  );
});

// API health check.
app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    message: "Mind Vault API is running"
  });
});

// API routes.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/notes", noteRoutes);
app.use("/api/v1/folders", folderRoutes);
app.use("/api/v1/knowledge-packs", knowledgePackRoutes);
app.use("/api/v1/downloads", downloadRoutes);
app.use("/api/v1/learning", learningRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/sync", syncRoutes);

export default app;