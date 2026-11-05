const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

let extractor: any = null;

const getExtractor = async () => {
  if (!extractor) {
    console.log("Loading local embedding model...");

    // Dynamically import the ES module.
    const { pipeline } = await import("@huggingface/transformers");

    extractor = await pipeline(
  "feature-extraction",
  MODEL_ID,
  {
    dtype: "int8"
  }
);

    console.log("Embedding model loaded successfully.");
  }

  return extractor;
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!text || !text.trim()) {
    throw new Error("Text cannot be empty.");
  }

  const model = await getExtractor();

  const output = await model(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data as Float32Array);
};
