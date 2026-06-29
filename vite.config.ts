import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { resolve } from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const projectRoot = __dirname;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "./src"),
    },
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
          overlay: false,
        }
      : { overlay: false },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, "index.html"),
        popup: resolve(projectRoot, "popup.html"),
      },
    },
  },
}));
