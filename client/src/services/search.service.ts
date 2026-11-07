import MiniSearch from "minisearch";
import JSZip from "jszip";

import { db } from "../db/database";

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
// CREATE SEARCH INDEX
// =====================================

const createSearchIndex = () => {
  return new MiniSearch<SearchDocument>({
    fields: ["title", "content"],

    storeFields: [
      "title",
      "content",
      "type",
      "noteId",
      "packId",
      "documentName"
    ],

    searchOptions: {
      boost: {
        title: 3,
        content: 1
      },
      fuzzy: 0.2,
      prefix: true
    }
  });
};

// =====================================
// LOAD NOTES INTO SEARCH INDEX
// =====================================

const indexLocalNotes = async (
  index: MiniSearch<SearchDocument>
): Promise<void> => {
  const notes = await db.notes.toArray();

  const documents: SearchDocument[] = notes.map((note) => ({
    id: `note:${note.id}`,
    title: note.title,
    content: note.content,
    type: "note",
    noteId: note.id
  }));

  if (documents.length > 0) {
    index.addAll(documents);
  }
};

// =====================================
// LOAD DOWNLOADED KNOWLEDGE PACKS
// =====================================

const indexKnowledgePacks = async (
  index: MiniSearch<SearchDocument>
): Promise<void> => {
  const packs = await db.packs.toArray();

  for (const pack of packs) {
    if (!pack.contentBlob) {
      continue;
    }

    try {
      const zip = await JSZip.loadAsync(pack.contentBlob);

      const files = Object.values(zip.files).filter(
        (file) =>
          !file.dir &&
          /\.(md|markdown|txt)$/i.test(file.name)
      );

      for (const file of files) {
        const content = await file.async("string");

        const document: SearchDocument = {
          id: `pack:${pack.id}:${file.name}`,
          title: `${pack.title} - ${file.name.split("/").pop()}`,
          content,
          type: "pack",
          packId: pack.id,
          documentName: file.name
        };

        index.add(document);
      }
    } catch (error) {
      console.error(
        `Could not index knowledge pack: ${pack.title}`,
        error
      );
    }
  }
};

// =====================================
// GENERATE SEARCH SNIPPET
// =====================================

const createSnippet = (
  content: string,
  query: string
): string => {
  const normalizedContent = content.replace(/\s+/g, " ").trim();

  if (!normalizedContent) {
    return "No preview available.";
  }

  const position = normalizedContent
    .toLowerCase()
    .indexOf(query.toLowerCase());

  if (position === -1) {
    return normalizedContent.slice(0, 200) + "...";
  }

  const start = Math.max(0, position - 70);
  const end = Math.min(
    normalizedContent.length,
    position + query.length + 130
  );

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
  query: string
): Promise<SearchResult[]> => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const index = createSearchIndex();

  await indexLocalNotes(index);
  await indexKnowledgePacks(index);

  const results = index.search(trimmedQuery, {
    combineWith: "OR"
  });

  return results.map((result) => {
    const content = String(result.content || "");

    return {
      id: String(result.id),
      title: String(result.title || "Untitled"),
      type: result.type as "note" | "pack",
      snippet: createSnippet(content, trimmedQuery),
      score: result.score,
      noteId: result.noteId
        ? String(result.noteId)
        : undefined,
      packId: result.packId
        ? String(result.packId)
        : undefined,
      documentName: result.documentName
        ? String(result.documentName)
        : undefined
    };
  });
};