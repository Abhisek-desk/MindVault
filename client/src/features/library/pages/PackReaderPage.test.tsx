// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, fireEvent } from "@testing-library/react";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";

import PackReaderPage from "./PackReaderPage";
import { getLocalPackById } from "../../../db/packs.db";

const { mockNavigate, mockUseParams } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

vi.mock("../../../db/packs.db", () => ({
  getLocalPackById: vi.fn(),
}));

const mockGetLocalPack = vi.mocked(getLocalPackById);

const createTestPack = async () => {
  const zip = new JSZip();

  zip.file("01-introduction.md", "Welcome to Mind Vault.");
  zip.file("02-advanced.md", "Advanced knowledge content.");

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
  });

  return {
    id: "507f1f77bcf86cd799439011",
    title: "Web Development",
    description: "Test knowledge pack",
    category: "Technology",
    language: "en",
    version: "1.0.0",
    fileSizeBytes: blob.size,
    downloadedAt: new Date().toISOString(),
    contentBlob: blob,
  };
};

describe("PackReaderPage", () => {
  afterEach(() => {
    cleanup();
  });
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseParams.mockReturnValue({
      packId: "507f1f77bcf86cd799439011",
    });
  });

  it("displays the loading state initially", () => {
    mockGetLocalPack.mockReturnValue(
      new Promise(() => {}) as ReturnType<typeof getLocalPackById>,
    );

    render(<PackReaderPage />);

    expect(
      screen.getByText("Opening your knowledge pack..."),
    ).toBeInTheDocument();
  });

  it("loads a downloaded knowledge pack and its first document", async () => {
    const pack = await createTestPack();

    mockGetLocalPack.mockResolvedValue(pack);

    render(<PackReaderPage />);

    expect(await screen.findByText("Web Development")).toBeInTheDocument();

    expect(
      await screen.findByText("Welcome to Mind Vault."),
    ).toBeInTheDocument();

    expect(screen.getByText("01-introduction.md")).toBeInTheDocument();
    expect(screen.getByText("02-advanced.md")).toBeInTheDocument();
  });

  it("switches between documents", async () => {
    const pack = await createTestPack();

    mockGetLocalPack.mockResolvedValue(pack);

    render(<PackReaderPage />);

    await screen.findByText("Welcome to Mind Vault.");

    fireEvent.click(
      screen.getByRole("button", {
        name: /02-advanced\.md/i,
      }),
    );

    expect(
      await screen.findByText("Advanced knowledge content."),
    ).toBeInTheDocument();
  });

  it("displays an error when the pack is not downloaded", async () => {
    mockGetLocalPack.mockResolvedValue(undefined);

    render(<PackReaderPage />);

    expect(
      await screen.findByText("This knowledge pack is not downloaded."),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Return to Library",
      }),
    ).toBeInTheDocument();
  });

  it("displays an error when the downloaded file is missing", async () => {
    mockGetLocalPack.mockResolvedValue({
      ...(await createTestPack()),
      contentBlob: undefined,
    });

    render(<PackReaderPage />);

    expect(
      await screen.findByText(
        "Downloaded file is not available on this device.",
      ),
    ).toBeInTheDocument();
  });

  it("returns to the library when the back button is clicked", async () => {
    const pack = await createTestPack();

    mockGetLocalPack.mockResolvedValue(pack);

    render(<PackReaderPage />);

    await screen.findByText("Welcome to Mind Vault.");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Back to library",
      }),
    );

    expect(mockNavigate).toHaveBeenCalledWith("/library");
  });
});
