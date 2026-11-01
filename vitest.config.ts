import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "fast", include: ["packages/*/test/**/*.test.ts"], exclude: ["**/*.slow.test.ts"] } },
      { test: { name: "slow", include: ["packages/*/test/**/*.slow.test.ts"], testTimeout: 30_000 } },
    ],
  },
});
