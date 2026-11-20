import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    exclude: ["**/node_modules/**", "dist/**"],
    // convex-test imports each component's convex.config to find its init,
    // and batch-worker's published config has extensionless relative imports.
    server: { deps: { inline: ["@convex-dev/batch-worker"] } },
    // globals: true,
  },
});
