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
  } = {},
): Promise<KnowledgePacksResponse> => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();

  return apiRequest<KnowledgePacksResponse>(
    `/knowledge-packs${query ? `?${query}` : ""}`,
  );
};

// GET SINGLE KNOWLEDGE PACK
export const getKnowledgePackById = async (
  id: string,
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
  pack: KnowledgePack,
): Promise<void> => {
  const MAX_PACK_SIZE = 50 * 1024 * 1024;
  const DOWNLOAD_TIMEOUT = 60000;

  if (typeof pack._id !== "string" || !/^[a-fA-F0-9]{24}$/.test(pack._id)) {
    throw new Error("Invalid knowledge pack ID.");
  }

  if (
    typeof pack.fileSizeBytes !== "number" ||
    !Number.isSafeInteger(pack.fileSizeBytes) ||
    pack.fileSizeBytes <= 0 ||
    pack.fileSizeBytes > MAX_PACK_SIZE
  ) {
    throw new Error("Invalid knowledge pack file size.");
  }

  if (
    typeof pack.downloadUrl !== "string" ||
    pack.downloadUrl.includes("example.com")
  ) {
    throw new Error("This knowledge pack does not have a valid download file.");
  }

  let downloadUrl: URL;

  try {
    downloadUrl = new URL(pack.downloadUrl);
  } catch {
    throw new Error("Invalid knowledge pack download URL.");
  }

  const expectedPath = /^\/downloads\/[a-zA-Z0-9_-]+\.zip$/;

  if (
    downloadUrl.protocol !== window.location.protocol ||
    downloadUrl.hostname !== window.location.hostname ||
    !expectedPath.test(downloadUrl.pathname) ||
    downloadUrl.search ||
    downloadUrl.hash ||
    downloadUrl.username ||
    downloadUrl.password
  ) {
    throw new Error("Untrusted knowledge pack download URL.");
  }

  // Create download record on the backend.
  await apiRequest<DownloadResponse>(`/downloads/${pack._id}`, {
    method: "POST",
  });

  const controller = new AbortController();

  const timeout = window.setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

  try {
    const response = await fetch(
      `${window.location.origin}${downloadUrl.pathname}`,
      {
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
        headers: {
          Accept: "application/zip",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error("Could not download the knowledge pack.");
    }

    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    if (
      contentType !== "application/zip" &&
      contentType !== "application/octet-stream"
    ) {
      throw new Error("Unexpected knowledge pack file type.");
    }

    const contentLength = response.headers.get("content-length");

    if (contentLength !== null) {
      const declaredLength = Number(contentLength);

      if (
        !Number.isSafeInteger(declaredLength) ||
        declaredLength <= 0 ||
        declaredLength > MAX_PACK_SIZE ||
        declaredLength !== pack.fileSizeBytes
      ) {
        throw new Error("Knowledge pack file size mismatch.");
      }
    }

    const contentBlob = await response.blob();

    if (
      contentBlob.size <= 0 ||
      contentBlob.size > MAX_PACK_SIZE ||
      contentBlob.size !== pack.fileSizeBytes
    ) {
      throw new Error("Downloaded knowledge pack has an invalid size.");
    }

    if (
      contentBlob.type &&
      !["application/zip", "application/octet-stream"].includes(
        contentBlob.type.toLowerCase(),
      )
    ) {
      throw new Error("Invalid knowledge pack content.");
    }

    const localPack: LocalPack = {
      id: pack._id,
      title: pack.title,
      description: pack.description,
      category: pack.category,
      language: pack.language,
      version: pack.version,
      downloadedAt: new Date().toISOString(),
      fileSizeBytes: contentBlob.size,
      contentBlob,
    };

    await saveLocalPack(localPack);

    await apiRequest<DownloadResponse>(`/downloads/${pack._id}/complete`, {
      method: "PATCH",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Knowledge pack download timed out.", { cause: error });
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Knowledge pack download failed.", { cause: error });
  } finally {
    window.clearTimeout(timeout);
  }
};

// REMOVE A DOWNLOADED KNOWLEDGE PACK
export const removeDownloadedPack = async (packId: string): Promise<void> => {
  await deleteLocalPack(packId);

  await apiRequest<DownloadResponse>(`/downloads/${packId}`, {
    method: "DELETE",
  });
};
