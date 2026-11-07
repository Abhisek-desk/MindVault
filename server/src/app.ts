import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRoutes from "./modules/auth/auth.routes";
import noteRoutes from "./modules/notes/note.routes";
import folderRoutes from "./modules/folders/folder.routes";
import knowledgePackRoutes from "./modules/knowledge-packs/knowledge-pack.routes";
import downloadRoutes from "./modules/downloads/download.routes";
import learningRoutes from "./modules/learning/learning.routes";
import aiRoutes from "./modules/ai/ai.routes";
import syncRoutes from "./modules/sync/sync.routes";
import path from "path";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
// Temporary request diagnostic
app.use((req, _res, next) => {
  console.log("INCOMING REQUEST:", req.method, req.originalUrl);
  next();
});

// Serve downloadable knowledge pack files
const downloadsDirectory = path.resolve(
  __dirname,
  "../public/downloads"
);

console.log("Knowledge packs directory:", downloadsDirectory);

app.get("/downloads/:filename", (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(downloadsDirectory, filename);

  console.log("Download requested:", filename);
  console.log("File path:", filePath);

  res.sendFile(filePath, (error) => {
    if (error) {
      console.error("Download error:", error.message);

      if (!res.headersSent) {
        next(error);
      }
    }
  });
});

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    message: "Mind Vault API is running"
  });
});

// Temporary diagnostic route
app.get("/api/v1/test-packs", (_req, res) => {
  res.json({
    success: true,
    message: "Knowledge Packs route registration is working"
  });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/notes", noteRoutes);
app.use("/api/v1/folders", folderRoutes);
app.use("/api/v1/knowledge-packs", knowledgePackRoutes);
app.use("/api/v1/downloads", downloadRoutes);
app.use("/api/v1/learning", learningRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/sync", syncRoutes);

console.log("Knowledge Packs routes registered");

export default app;