import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 3102,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
  plugins: command === "build" ? [react()] : [],
}));
