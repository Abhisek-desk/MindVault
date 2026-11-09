import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const { pipelineMock } = vi.hoisted(() => ({
  pipelineMock: vi.fn()
}));

vi.mock("@huggingface/transformers", () => ({
  pipeline: pipelineMock
}));

const createModel = () =>
  vi.fn().mockResolvedValue({
    data: new Float32Array(384).fill(0.5)
  });

describe("Embedding Service", () => {
  beforeEach(() => {
    vi.resetModules();
    pipelineMock.mockReset();
  });

  it("should generate a valid 384-dimensional embedding", async () => {
    const model = createModel();

    pipelineMock.mockResolvedValue(model);

    const { generateEmbedding } = await import(
      "./embedding.service.js"
    );

    const embedding = await generateEmbedding(
      "Mind Vault stores personal knowledge."
    );

    expect(embedding).toHaveLength(384);
    expect(embedding.every(Number.isFinite)).toBe(true);
    expect(model).toHaveBeenCalledOnce();
  });

  it("should reject empty input", async () => {
    const { generateEmbedding } = await import(
      "./embedding.service.js"
    );

    await expect(
      generateEmbedding("   ")
    ).rejects.toThrow("Text cannot be empty.");

    expect(pipelineMock).not.toHaveBeenCalled();
  });

  it("should reject non-string input", async () => {
    const { generateEmbedding } = await import(
      "./embedding.service.js"
    );

    await expect(
      generateEmbedding(null as unknown as string)
    ).rejects.toThrow("Text cannot be empty.");
  });

  it("should limit model input to 20,000 characters", async () => {
    const model = createModel();

    pipelineMock.mockResolvedValue(model);

    const { generateEmbedding } = await import(
      "./embedding.service.js"
    );

    const longText = "a".repeat(25000);

    await generateEmbedding(longText);

    expect(model).toHaveBeenCalledWith(
      "a".repeat(20000),
      {
        pooling: "mean",
        normalize: true
      }
    );
  });

  it("should prevent duplicate concurrent model loading", async () => {
    const model = createModel();

    pipelineMock.mockResolvedValue(model);

    const { generateEmbedding } = await import(
      "./embedding.service.js"
    );

    const results = await Promise.all([
      generateEmbedding("First note"),
      generateEmbedding("Second note"),
      generateEmbedding("Third note")
    ]);

    expect(pipelineMock).toHaveBeenCalledOnce();
    expect(model).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
  });

  it("should reject embeddings with incorrect dimensions", async () => {
    const model = vi.fn().mockResolvedValue({
      data: new Float32Array(100)
    });

    pipelineMock.mockResolvedValue(model);

    const { generateEmbedding } = await import(
      "./embedding.service.js"
    );

    await expect(
      generateEmbedding("Test note")
    ).rejects.toThrow(
      "Embedding model returned an invalid embedding."
    );
  });

  it("should reject embeddings containing non-finite values", async () => {
    const invalidData = new Float32Array(384);
    invalidData[10] = Number.NaN;

    const model = vi.fn().mockResolvedValue({
      data: invalidData
    });

    pipelineMock.mockResolvedValue(model);

    const { generateEmbedding } = await import(
      "./embedding.service.js"
    );

    await expect(
      generateEmbedding("Test note")
    ).rejects.toThrow(
      "Embedding model returned an invalid embedding."
    );
  });

  it("should recover when model loading initially fails", async () => {
    const model = createModel();

    pipelineMock
      .mockRejectedValueOnce(
        new Error("Model loading failed")
      )
      .mockResolvedValueOnce(model);

    const { generateEmbedding } = await import(
      "./embedding.service.js"
    );

    await expect(
      generateEmbedding("First attempt")
    ).rejects.toThrow("Model loading failed");

    const embedding = await generateEmbedding(
      "Second attempt"
    );

    expect(embedding).toHaveLength(384);
    expect(pipelineMock).toHaveBeenCalledTimes(2);
  });

  it("should reject missing model output data", async () => {
    const model = vi.fn().mockResolvedValue({
      data: undefined
    });

    pipelineMock.mockResolvedValue(model);

    const { generateEmbedding } = await import(
      "./embedding.service.js"
    );

    await expect(
      generateEmbedding("Test note")
    ).rejects.toThrow(
      "Embedding model returned invalid output data."
    );
  });
});
