import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    fileParallelism: false,
  },
});