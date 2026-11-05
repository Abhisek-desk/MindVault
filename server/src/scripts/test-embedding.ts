import { generateEmbedding } from "../modules/ai/embedding.service";

const cosineSimilarity = (
  vectorA: number[],
  vectorB: number[]
): number => {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] ** 2;
    magnitudeB += vectorB[i] ** 2;
  }

  return dotProduct / (
    Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB)
  );
};

const testEmbeddings = async () => {
  try {
    console.log("\nGenerating embeddings...\n");

    const sentence1 = "React is a JavaScript library.";
    const sentence2 = "React helps developers build user interfaces.";
    const sentence3 = "The weather is sunny today.";

    const embedding1 = await generateEmbedding(sentence1);
    const embedding2 = await generateEmbedding(sentence2);
    const embedding3 = await generateEmbedding(sentence3);

    console.log("Embedding dimensions:", embedding1.length);

    console.log(
      "\nSimilarity between related sentences:",
      cosineSimilarity(embedding1, embedding2).toFixed(4)
    );

    console.log(
      "Similarity between unrelated sentences:",
      cosineSimilarity(embedding1, embedding3).toFixed(4)
    );

    console.log("\nEmbedding test completed successfully!");
  } catch (error) {
    console.error("\nEmbedding test failed:", error);
    process.exitCode = 1;
  }
};

testEmbeddings();