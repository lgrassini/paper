/**
 * vitest.config.ts — Test runner configuration.
 * Targets the Node environment; no browser globals needed for the backend.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
