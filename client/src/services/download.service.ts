import { apiRequest } from "./api";
import { saveLocalPack, deleteLocalPack } from "../db/packs.db";
import type { LocalPack } from "../db/database";

// Knowledge pack returned by the backend
export interface KnowledgePack {
  _id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  version: string;
  coverImage?: string;
  downloadUrl: string;
  fileSizeBytes: number;
  tags: string[];
  isPublished: boolean;
}

// Knowledge pack catalogue response
interface KnowledgePacksResponse {
  success: boolean;
  count: number;
  total: number;
  currentPage: number;
  totalPages: number;
  packs: KnowledgePack[];
}

// Download tracking response
interface DownloadResponse {
  success: boolean;
  message: string;
}

// Downloaded packs response
interface UserDownloadsResponse {
  success: boolean;
  downloads: Array<{
    knowledgePackId: string;
    status: "pending" | "completed" | "failed";
  }>;
}

// GET KNOWLEDGE PACK CATALOGUE
export const getKnowledgePacks = async (
  filters: {
    category?: string;
    language?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<KnowledgePacksResponse> => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();

  return apiRequest<KnowledgePacksResponse>(
    `/knowledge-packs${query ? `?${query}` : ""}`
  );
};

// GET SINGLE KNOWLEDGE PACK
export const getKnowledgePackById = async (
  id: string
): Promise<KnowledgePack> => {
  const response = await apiRequest<{
    success: boolean;
    pack: KnowledgePack;
  }>(`/knowledge-packs/${id}`);

  return response.pack;
};

// GET USER'S DOWNLOAD RECORDS
export const getUserDownloads = async (): Promise<UserDownloadsResponse> => {
  return apiRequest<UserDownloadsResponse>("/downloads");
};

// DOWNLOAD A KNOWLEDGE PACK
export const downloadKnowledgePack = async (
  pack: KnowledgePack
): Promise<void> => {
  // Prevent downloading placeholder files
  if (pack.downloadUrl.includes("example.com")) {
    throw new Error(
      "This knowledge pack does not have a real download file yet."
    );
  }

  // Create download record on the backend
  await apiRequest<DownloadResponse>(
    `/downloads/${pack._id}`,
    { method: "POST" }
  );

  try {
    // Download the actual file
    const response = await fetch(pack.downloadUrl);

    if (!response.ok) {
      throw new Error("Could not download the knowledge pack.");
    }

    const contentBlob = await response.blob();

    // Save downloaded pack in IndexedDB
    const localPack: LocalPack = {
      id: pack._id,
      title: pack.title,
      description: pack.description,
      category: pack.category,
      language: pack.language,
      version: pack.version,
      downloadedAt: new Date().toISOString(),
      fileSizeBytes: pack.fileSizeBytes,
      contentBlob
    };

    await saveLocalPack(localPack);

    // Mark download as completed on the backend
    await apiRequest<DownloadResponse>(
      `/downloads/${pack._id}/complete`,
      { method: "PATCH" }
    );
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Knowledge pack download failed.");
  }
};

// REMOVE A DOWNLOADED KNOWLEDGE PACK
export const removeDownloadedPack = async (
  packId: string
): Promise<void> => {
  await deleteLocalPack(packId);

  await apiRequest<DownloadResponse>(
    `/downloads/${packId}`,
    { method: "DELETE" }
  );
};