import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "./src/test-setup.ts")],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tauri-apps/api/core": path.resolve(__dirname, "./src/__mocks__/@tauri-apps-api-core.ts"),
      "@tauri-apps/api/event": path.resolve(__dirname, "./src/__mocks__/@tauri-apps-api-event.ts"),
      "@tauri-apps/api/window": path.resolve(__dirname, "./src/__mocks__/@tauri-apps-api-window.ts"),
    },
  },
});
