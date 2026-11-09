import { Note } from "../notes/note.model";
import { generateEmbedding } from "./embedding.service";

export interface RetrievedNote {
  title: string;
  content: string;
  updatedAt: Date;
}

interface ScoredNote extends RetrievedNote {
  semanticScore: number;
  keywordScore: number;
  finalScore: number;
}

const MAX_NOTES_TO_SCAN = 500;
const MAX_RESULTS = 5;

const MAX_TITLE_LENGTH = 150;
const MAX_NOTE_CONTENT_LENGTH = 3000;

const EXPECTED_EMBEDDING_DIMENSIONS = 384;

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "was", "were",
  "what", "when", "where", "which", "who",
  "how", "why", "can", "could", "would",
  "should", "with", "from", "that", "this",
  "have", "has", "had", "about", "into",
  "your", "you", "me", "my", "tell", "explain",
  "did", "does", "do", "saved", "save"
]);

const isValidEmbedding = (
  embedding: unknown
): embedding is number[] => {
  return (
    Array.isArray(embedding) &&
    embedding.length === EXPECTED_EMBEDDING_DIMENSIONS &&
    embedding.every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value)
    )
  );
};

const cosineSimilarity = (
  vectorA: number[],
  vectorB: number[]
): number => {
  if (
    !isValidEmbedding(vectorA) ||
    !isValidEmbedding(vectorB)
  ) {
    return -1;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] ** 2;
    magnitudeB += vectorB[i] ** 2;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return -1;
  }

  const similarity =
    dotProduct /
    (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));

  return Number.isFinite(similarity)
    ? similarity
    : -1;
};

const normalizeSemanticScore = (
  score: number
): number => {
  const minimumScore = 0.25;

  if (!Number.isFinite(score) || score < minimumScore) {
    return 0;
  }

  return Math.min(
    1,
    (score - minimumScore) / (1 - minimumScore)
  );
};

export const retrieveRelevantNotes = async (
  userId: string,
  question: string
): Promise<RetrievedNote[]> => {
  if (!userId || !question?.trim()) {
    return [];
  }

  let questionEmbedding: number[] = [];

  // Step 1: Generate and validate the question embedding.
  try {
    const generatedEmbedding = await generateEmbedding(question);

    if (isValidEmbedding(generatedEmbedding)) {
      questionEmbedding = generatedEmbedding;
    } else {
      console.warn(
        "Invalid question embedding. Using keyword search."
      );
    }
  } catch (error) {
    console.error(
      "Question embedding failed. Using keyword search:",
      error
    );
  }

  // Step 2: Extract useful keywords.
  const keywords = [
    ...new Set(
      question
        .toLowerCase()
        .match(/[a-z0-9]{3,}/g)
        ?.filter((word) => !STOP_WORDS.has(word)) || []
    )
  ].slice(0, 8);

  // Step 3: Retrieve only this user's notes.
  const notes = await Note.find({ userId })
    .select("+embedding title content updatedAt")
    .sort({ updatedAt: -1 })
    .limit(MAX_NOTES_TO_SCAN)
    .lean();

  // Step 4: Calculate relevance scores.
  const scoredNotes: ScoredNote[] = [];

  for (const note of notes) {
    const title =
      typeof note.title === "string"
        ? note.title
        : "";

    const content =
      typeof note.content === "string"
        ? note.content
        : "";

    const searchableText =
      `${title} ${content}`.toLowerCase();

    // Calculate semantic similarity.
    let semanticScore = 0;

    if (
      questionEmbedding.length > 0 &&
      isValidEmbedding(note.embedding)
    ) {
      semanticScore = cosineSimilarity(
        questionEmbedding,
        note.embedding
      );
    }

    const normalizedSemanticScore =
      normalizeSemanticScore(semanticScore);

    // Calculate keyword relevance.
    const matchedKeywords = keywords.filter(
      (keyword) => searchableText.includes(keyword)
    ).length;

    const keywordScore =
      keywords.length > 0
        ? matchedKeywords / keywords.length
        : 0;

    // Ignore irrelevant notes.
    if (
      normalizedSemanticScore === 0 &&
      keywordScore === 0
    ) {
      continue;
    }

    // Combine semantic and keyword relevance.
    const finalScore =
      questionEmbedding.length > 0
        ? normalizedSemanticScore * 0.7 +
          keywordScore * 0.3
        : keywordScore;

    scoredNotes.push({
      title,
      content,
      updatedAt: note.updatedAt,
      semanticScore: normalizedSemanticScore,
      keywordScore,
      finalScore
    });
  }

  // Step 5: Sort by relevance.
  scoredNotes.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }

    return (
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime()
    );
  });

  // Step 6: Return a maximum of five bounded results.
  return scoredNotes
    .slice(0, MAX_RESULTS)
    .map((note) => ({
      title: note.title.slice(0, MAX_TITLE_LENGTH),
      content: note.content.slice(
        0,
        MAX_NOTE_CONTENT_LENGTH
      ),
      updatedAt: note.updatedAt
    }));
};