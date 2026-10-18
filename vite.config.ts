import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base "./" lets the static build be hosted from any sub-path (GitHub Pages, S3, Azure Static Web Apps).
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",
    // The persistent module cache does not notice new files matched by import.meta.glob
    // (src/data/lessons/index.ts), so newly added lessons would be skipped by the tests.
    fsModuleCache: false,
  },
});
