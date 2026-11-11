import Dexie from "dexie";
import MiniSearch from "minisearch";
import JSZip from "jszip";

import { db, withDatabaseLease, getActiveDatabaseUserId } from "../db/database";

// =====================================
// SEARCH RESULT TYPES
// =====================================

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  type: "note" | "pack";
  noteId?: string;
  packId?: string;
  documentName?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  type: "note" | "pack";
  snippet: string;
  score: number;
  noteId?: string;
  packId?: string;
  documentName?: string;
}

// =====================================
// SEARCH INDEX CACHE
// =====================================

let cachedIndex: MiniSearch<SearchDocument> | null = null;
let cachedIndexRevision = -1;
let cachedIndexUserId: string | null = null;

let indexBuildPromise: Promise<MiniSearch<SearchDocument>> | null = null;
let indexBuildRevision = -1;
let indexBuildUserId: string | null = null;

let indexRevision = 0;

// =====================================
// INVALIDATE INDEX WHEN DATA CHANGES
// =====================================

Dexie.on("storagemutated", (parts) => {
  const relevantMutation = Object.keys(parts).some(
    (part) =>
      part.startsWith(`idb://${db.name}/notes/`) ||
      part.startsWith(`idb://${db.name}/packs/`),
  );

  if (!relevantMutation) {
    return;
  }

  indexRevision++;

  cachedIndex = null;
  cachedIndexRevision = -1;

  // Existing builds are allowed to finish, but their
  // results will not be cached if the revision changed.
});

// =====================================
// CREATE SEARCH INDEX
// =====================================

const createSearchIndex = (): MiniSearch<SearchDocument> => {
  return new MiniSearch<SearchDocument>({
    fields: ["title", "content"],

    storeFields: [
      "title",
      "content",
      "type",
      "noteId",
      "packId",
      "documentName",
    ],

    searchOptions: {
      boost: {
        title: 3,
        content: 1,
      },
      fuzzy: 0.2,
      prefix: true,
    },
  });
};

// =====================================
// LOAD NOTES INTO SEARCH INDEX
// =====================================

const indexLocalNotes = async (
  index: MiniSearch<SearchDocument>,
): Promise<void> => {
  const notes = await db.notes.toArray();

  const documents: SearchDocument[] = notes.map((note) => ({
    id: `note:${note.id}`,
    title: note.title,
    content: note.content,
    type: "note",
    noteId: note.id,
  }));

  if (documents.length > 0) {
    index.addAll(documents);
  }
};

// =====================================
// LOAD DOWNLOADED KNOWLEDGE PACKS
// =====================================

const indexKnowledgePacks = async (
  index: MiniSearch<SearchDocument>,
): Promise<void> => {
  const packs = await db.packs.toArray();

  for (const pack of packs) {
    if (!pack.contentBlob) {
      continue;
    }

    try {
      const zip = await JSZip.loadAsync(pack.contentBlob);

      const files = Object.values(zip.files).filter(
        (file) => !file.dir && /\.(md|markdown|txt)$/i.test(file.name),
      );

      for (const file of files) {
        const content = await file.async("string");

        const document: SearchDocument = {
          id: `pack:${pack.id}:${file.name}`,
          title: `${pack.title} - ${file.name.split("/").pop()}`,
          content,
          type: "pack",
          packId: pack.id,
          documentName: file.name,
        };

        index.add(document);
      }
    } catch {
      if (import.meta.env.DEV) {
        console.error("Could not index a downloaded knowledge pack.");
      }
    }
  }
};

// =====================================
// BUILD SEARCH INDEX
// =====================================

const buildSearchIndex = async (): Promise<MiniSearch<SearchDocument>> => {
  const index = createSearchIndex();

  await indexLocalNotes(index);
  await indexKnowledgePacks(index);

  return index;
};

// =====================================
// GET REUSABLE SEARCH INDEX
// =====================================

const getSearchIndex = async (
  userId: string | null,
): Promise<MiniSearch<SearchDocument>> => {
  if (
    cachedIndex &&
    cachedIndexRevision === indexRevision &&
    cachedIndexUserId === userId
  ) {
    return cachedIndex;
  }

  if (
    indexBuildPromise &&
    indexBuildRevision === indexRevision &&
    indexBuildUserId === userId
  ) {
    return indexBuildPromise;
  }

  const buildRevision = indexRevision;

  const buildPromise = (async () => {
    const index = await buildSearchIndex();

    if (buildRevision !== indexRevision) {
      return getSearchIndex(userId);
    }

    cachedIndex = index;
    cachedIndexRevision = buildRevision;
    cachedIndexUserId = userId;

    return index;
  })();

  indexBuildPromise = buildPromise;
  indexBuildRevision = buildRevision;
  indexBuildUserId = userId;

  try {
    return await buildPromise;
  } finally {
    if (indexBuildPromise === buildPromise) {
      indexBuildPromise = null;
      indexBuildRevision = -1;
      indexBuildUserId = null;
    }
  }
};

// =====================================
// GENERATE SEARCH SNIPPET
// =====================================

const createSnippet = (content: string, query: string): string => {
  const normalizedContent = content.replace(/\s+/g, " ").trim();

  if (!normalizedContent) {
    return "No preview available.";
  }

  const position = normalizedContent.toLowerCase().indexOf(query.toLowerCase());

  if (position === -1) {
    return normalizedContent.slice(0, 200) + "...";
  }

  const start = Math.max(0, position - 70);

  const end = Math.min(normalizedContent.length, position + query.length + 130);

  return (
    (start > 0 ? "..." : "") +
    normalizedContent.slice(start, end) +
    (end < normalizedContent.length ? "..." : "")
  );
};

// =====================================
// SEARCH ALL LOCAL CONTENT
// =====================================

export const searchOfflineContent = async (
  query: string,
): Promise<SearchResult[]> => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  return withDatabaseLease(async () => {
    const userId = getActiveDatabaseUserId();
    const index = await getSearchIndex(userId);

    const results = index.search(trimmedQuery, {
      combineWith: "OR",
    });

    return results.map((result) => {
      const content = String(result.content || "");

      return {
        id: String(result.id),
        title: String(result.title || "Untitled"),
        type: result.type as "note" | "pack",
        snippet: createSnippet(content, trimmedQuery),
        score: result.score,
        noteId: result.noteId ? String(result.noteId) : undefined,
        packId: result.packId ? String(result.packId) : undefined,
        documentName: result.documentName
          ? String(result.documentName)
          : undefined,
      };
    });
  });
};
