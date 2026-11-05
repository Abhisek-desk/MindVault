import { Note } from "../notes/note.model";
import { generateEmbedding } from "./embedding.service";

interface RetrievedNote {
  title: string;
  content: string;
  updatedAt: Date;
}

interface ScoredNote extends RetrievedNote {
  semanticScore: number;
  keywordScore: number;
  finalScore: number;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "was", "were",
  "what", "when", "where", "which", "who",
  "how", "why", "can", "could", "would",
  "should", "with", "from", "that", "this",
  "have", "has", "had", "about", "into",
  "your", "you", "me", "my", "tell", "explain",
  "did", "does", "do", "saved", "save"
]);

const cosineSimilarity = (
  vectorA: number[],
  vectorB: number[]
): number => {
  if (vectorA.length !== vectorB.length) {
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

  return dotProduct / (
    Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB)
  );
};

const normalizeSemanticScore = (score: number): number => {
  const minimumScore = 0.25;

  if (score < minimumScore) {
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

  let questionEmbedding: number[] = [];

  // Step 1: Generate question embedding
  try {
    questionEmbedding = await generateEmbedding(question);
  } catch (error) {
    console.error(
      "Question embedding failed. Using keyword search:",
      error
    );
  }

  // Step 2: Extract useful keywords
  const keywords = [
    ...new Set(
      question
        .toLowerCase()
        .match(/[a-z0-9]{3,}/g)
        ?.filter((word) => !STOP_WORDS.has(word)) || []
    )
  ].slice(0, 8);

  // Step 3: Retrieve this user's notes
  const notes = await Note.find({ userId })
    .select("+embedding title content updatedAt")
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean();

  // Step 4: Calculate combined relevance scores
  const scoredNotes: ScoredNote[] = [];

  for (const note of notes) {
    const searchableText =
      `${note.title} ${note.content}`.toLowerCase();

    // Calculate semantic similarity
    let semanticScore = 0;

    if (
      questionEmbedding.length > 0 &&
      Array.isArray(note.embedding) &&
      note.embedding.length === questionEmbedding.length
    ) {
      semanticScore = cosineSimilarity(
        questionEmbedding,
        note.embedding as number[]
      );
    }

    const normalizedSemanticScore =
      normalizeSemanticScore(semanticScore);

    // Calculate keyword relevance
    const matchedKeywords = keywords.filter((keyword) =>
      searchableText.includes(keyword)
    ).length;

    const keywordScore =
      keywords.length > 0
        ? matchedKeywords / keywords.length
        : 0;

    // Skip notes with no meaningful relevance
    if (
      normalizedSemanticScore === 0 &&
      keywordScore === 0
    ) {
      continue;
    }

    // Combine semantic and keyword scores
    let finalScore = 0;

    if (questionEmbedding.length > 0) {
      finalScore =
        normalizedSemanticScore * 0.7 +
        keywordScore * 0.3;
    } else {
      // Keyword-only fallback
      finalScore = keywordScore;
    }

    scoredNotes.push({
      title: note.title,
      content: note.content,
      updatedAt: note.updatedAt,
      semanticScore: normalizedSemanticScore,
      keywordScore,
      finalScore
    });
  }

  // Step 5: Sort by combined relevance
  scoredNotes.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }

    return (
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime()
    );
  });

  // Step 6: Return the five most relevant notes
  return scoredNotes.slice(0, 5).map((note) => ({
    title: note.title,
    content: note.content,
    updatedAt: note.updatedAt
  }));
};