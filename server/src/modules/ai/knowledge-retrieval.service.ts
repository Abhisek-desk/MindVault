import { Note } from "../notes/note.model";
import { generateEmbedding } from "./embedding.service";

interface RetrievedNote {
  title: string;
  content: string;
  updatedAt: Date;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "was", "were",
  "what", "when", "where", "which", "who",
  "how", "why", "can", "could", "would",
  "should", "with", "from", "that", "this",
  "have", "has", "had", "about", "into",
  "your", "you", "me", "my", "tell", "explain"
]);

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Calculate cosine similarity between two vectors.
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

export const retrieveRelevantNotes = async (
  userId: string,
  question: string
): Promise<RetrievedNote[]> => {

  // ------------------------------------
  // STEP 1: Generate question embedding
  // ------------------------------------

  let questionEmbedding: number[];

  try {
    questionEmbedding = await generateEmbedding(question);
  } catch (error) {
    console.error(
      "Question embedding failed. Using keyword search:",
      error
    );

    questionEmbedding = [];
  }

  // ------------------------------------
  // STEP 2: Extract search keywords
  // ------------------------------------

  const keywords = [
    ...new Set(
      question
        .toLowerCase()
        .match(/[a-z0-9]{3,}/g)
        ?.filter((word) => !STOP_WORDS.has(word)) || []
    )
  ].slice(0, 8);

  // ------------------------------------
  // STEP 3: Retrieve user's notes
  // ------------------------------------

  const notes = await Note.find({ userId })
    .select("+embedding title content updatedAt")
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean();

  // ------------------------------------
  // STEP 4: Semantic ranking
  // ------------------------------------

  const semanticResults = notes
    .filter(
      (note) =>
        questionEmbedding.length > 0 &&
        Array.isArray(note.embedding) &&
        note.embedding.length === questionEmbedding.length
    )
    .map((note) => ({
      title: note.title,
      content: note.content,
      updatedAt: note.updatedAt,
      score: cosineSimilarity(
        questionEmbedding,
        note.embedding as number[]
      )
    }))
    .filter((note) => note.score >= 0.25)
    .sort((a, b) => b.score - a.score);

  // ------------------------------------
  // STEP 5: Keyword fallback
  // ------------------------------------

  let keywordResults: RetrievedNote[] = [];

  if (keywords.length > 0) {
    const searchConditions = keywords.map((keyword) => {
      const pattern = new RegExp(escapeRegex(keyword), "i");

      return {
        $or: [
          { title: pattern },
          { content: pattern }
        ]
      };
    });

    const matchingNotes = await Note.find({
      userId,
      $or: searchConditions
    })
      .select("title content updatedAt")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    keywordResults = matchingNotes
      .map((note) => {
        const searchableText =
          `${note.title} ${note.content}`.toLowerCase();

        const score = keywords.reduce(
          (total, keyword) =>
            total + (
              searchableText.includes(keyword) ? 1 : 0
            ),
          0
        );

        return {
          title: note.title,
          content: note.content,
          updatedAt: note.updatedAt,
          score
        };
      })
      .filter((note) => note.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  // ------------------------------------
  // STEP 6: Combine results
  // ------------------------------------

  const combinedResults = [
    ...semanticResults,
    ...keywordResults
  ];

  // Remove duplicate notes using their title and content.
  const uniqueResults = new Map<string, RetrievedNote>();

  for (const note of combinedResults) {
    const key = `${note.title}::${note.content}`;

    if (!uniqueResults.has(key)) {
      uniqueResults.set(key, {
        title: note.title,
        content: note.content,
        updatedAt: note.updatedAt
      });
    }
  }

  // Return the five most relevant notes.
  return Array.from(uniqueResults.values()).slice(0, 5);
};