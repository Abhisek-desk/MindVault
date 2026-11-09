import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    // Integration tests are stored in the tests directory.
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],

    globals: false,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    fileParallelism: false,
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,

    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
