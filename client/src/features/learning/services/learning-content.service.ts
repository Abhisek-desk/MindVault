import JSZip from "jszip";

import { getLocalPackById } from "../../../db/packs.db";

// =====================================
// LIMITS
// =====================================

const MAX_PACK_SIZE = 50 * 1024 * 1024;
const MAX_LESSON_SIZE = 2 * 1024 * 1024;
const MAX_LESSONS = 500;

// =====================================
// TYPES
// =====================================

export interface LearningLesson {
  id: string;
  title: string;
  path: string;
  extension: "md" | "markdown" | "txt";
}

export interface LearningPackContent {
  packId: string;
  title: string;
  description: string;
  category: string;
  language: string;
  lessons: LearningLesson[];
  getLessonContent: (lessonId: string) => Promise<string>;
}

// =====================================
// VALIDATION
// =====================================

const isValidPackId = (value: string): boolean =>
  /^[a-fA-F0-9]{24}$/.test(value);

const normalizeLessonPath = (
  path: string,
): string | null => {
  if (
    !path ||
    path.length > 200 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0")
  ) {
    return null;
  }

  const segments = path.split("/");

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.startsWith("."),
    )
  ) {
    return null;
  }

  if (segments.includes("__MACOSX")) {
    return null;
  }

  const extension = path.split(".").pop()?.toLowerCase();

  if (
    extension !== "md" &&
    extension !== "markdown" &&
    extension !== "txt"
  ) {
    return null;
  }

  return path;
};

const getLessonTitle = (path: string): string => {
  const filename = path.split("/").pop() ?? path;

  return filename
    .replace(/\.(md|markdown|txt)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// =====================================
// OPEN LOCAL LEARNING PACK
// =====================================

export const openLearningPack = async (
  packId: string,
): Promise<LearningPackContent> => {
  if (!isValidPackId(packId)) {
    throw new Error("Invalid knowledge pack ID.");
  }

  const pack = await getLocalPackById(packId);

  if (!pack) {
    throw new Error(
      "This knowledge pack is not downloaded on this device.",
    );
  }

  if (!(pack.contentBlob instanceof Blob)) {
    throw new Error(
      "Downloaded knowledge pack content is unavailable.",
    );
  }

  if (
    pack.contentBlob.size <= 0 ||
    pack.contentBlob.size > MAX_PACK_SIZE
  ) {
    throw new Error(
      "Knowledge pack exceeds the maximum allowed size.",
    );
  }

  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(pack.contentBlob, {
      checkCRC32: true,
    });
  } catch {
    throw new Error(
      "Knowledge pack is damaged or has an invalid ZIP format.",
    );
  }

  // =====================================
  // DISCOVER LESSONS
  // =====================================

  const lessons: LearningLesson[] = [];

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) {
      continue;
    }

    const safePath = normalizeLessonPath(path);

    if (!safePath) {
      continue;
    }

    const extension = safePath
      .split(".")
      .pop()
      ?.toLowerCase();

    if (
      extension !== "md" &&
      extension !== "markdown" &&
      extension !== "txt"
    ) {
      continue;
    }

    lessons.push({
      id: safePath,
      title: getLessonTitle(safePath),
      path: safePath,
      extension,
    });

    if (lessons.length > MAX_LESSONS) {
      throw new Error(
        "This knowledge pack contains more than 500 readable lessons.",
      );
    }
  }

  lessons.sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  if (lessons.length === 0) {
    throw new Error(
      "No readable Markdown or text lessons were found in this knowledge pack.",
    );
  }

  const lessonPaths = new Set(
    lessons.map((lesson) => lesson.id),
  );

  // =====================================
  // RETURN PACK CONTENT
  // =====================================

  return {
    packId: pack.id,
    title: pack.title,
    description: pack.description,
    category: pack.category,
    language: pack.language,
    lessons,

    // =====================================
    // LOAD INDIVIDUAL LESSON
    // =====================================

    getLessonContent: async (
      lessonId: string,
    ): Promise<string> => {
      if (
        typeof lessonId !== "string" ||
        lessonId.trim().length === 0 ||
        lessonId.length > 200
      ) {
        throw new Error("Invalid lesson ID.");
      }

      if (!lessonPaths.has(lessonId)) {
        throw new Error(
          "Lesson does not belong to this knowledge pack.",
        );
      }

      const file = zip.file(lessonId);

      if (!file || file.dir) {
        throw new Error(
          "Lesson does not belong to this knowledge pack.",
        );
      }

      let content: string;

      try {
        content = await file.async("string");
      } catch {
        throw new Error("Unable to read lesson content.");
      }

      const contentSize = new TextEncoder().encode(
        content,
      ).byteLength;

      if (contentSize > MAX_LESSON_SIZE) {
        throw new Error(
          "This lesson exceeds the maximum allowed content size.",
        );
      }

      return content;
    },
  };
};