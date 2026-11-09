const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

const EMBEDDING_DIMENSIONS = 384;

// Limit text sent to the embedding model.
// Original notes remain unchanged in the database.
const MAX_EMBEDDING_INPUT_LENGTH = 20000;

let extractor: any = null;
let extractorPromise: Promise<any> | null = null;

const getExtractor = async () => {
  if (extractor) {
    return extractor;
  }

  if (!extractorPromise) {
    extractorPromise = (async () => {
      console.log("Loading local embedding model...");

      const { pipeline } = await import(
        "@huggingface/transformers"
      );

      const model = await pipeline(
        "feature-extraction",
        MODEL_ID,
        {
          dtype: "int8"
        }
      );

      extractor = model;

      console.log("Embedding model loaded successfully.");

      return model;
    })().catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }

  return extractorPromise;
};

export const generateEmbedding = async (
  text: string
): Promise<number[]> => {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Text cannot be empty.");
  }

  // Prevent excessively large inputs from consuming resources.
  const normalizedText = text
    .trim()
    .slice(0, MAX_EMBEDDING_INPUT_LENGTH);

  const model = await getExtractor();

  const output = await model(normalizedText, {
    pooling: "mean",
    normalize: true
  });

  if (
    !output ||
    !output.data ||
    typeof output.data.length !== "number"
  ) {
    throw new Error(
      "Embedding model returned invalid output data."
    );
  }

  const embedding = Array.from(
    output.data as ArrayLike<number>
  );

  if (
    embedding.length !== EMBEDDING_DIMENSIONS ||
    !embedding.every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value)
    )
  ) {
    throw new Error(
      "Embedding model returned an invalid embedding."
    );
  }

  return embedding;
};