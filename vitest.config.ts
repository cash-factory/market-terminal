import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright browser tests run separately in GitHub Actions.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
});
