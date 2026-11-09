import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { Download } from "./download.model";

describe("Download Model Validation", () => {
  const validDownload = {
    userId: new mongoose.Types.ObjectId(),
    knowledgePackId: new mongoose.Types.ObjectId(),
    version: "1.0.0",
    status: "pending",
  };

  it("should accept a valid download record", () => {
    const download = new Download(validDownload);

    expect(download.validateSync()).toBeUndefined();
  });

  it("should trim whitespace from the version", () => {
    const download = new Download({
      ...validDownload,
      version: "  1.0.0  ",
    });

    download.validateSync();

    expect(download.version).toBe("1.0.0");
  });

  it("should reject versions longer than 50 characters", () => {
    const download = new Download({
      ...validDownload,
      version: "a".repeat(51),
    });

    const error = download.validateSync();

    expect(error?.errors.version).toBeDefined();
  });

  it("should reject invalid download statuses", () => {
    const download = new Download({
      ...validDownload,
      status: "unknown",
    });

    const error = download.validateSync();

    expect(error?.errors.status).toBeDefined();
  });

  it("should accept a null downloadedAt value", () => {
    const download = new Download({
      ...validDownload,
      downloadedAt: null,
    });

    expect(download.validateSync()).toBeUndefined();
  });

  it("should reject a missing version", () => {
    const download = new Download({
      userId: validDownload.userId,
      knowledgePackId: validDownload.knowledgePackId,
    });

    const error = download.validateSync();

    expect(error?.errors.version).toBeDefined();
  });
});