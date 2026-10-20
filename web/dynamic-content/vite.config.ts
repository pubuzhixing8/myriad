import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  server: { port: 3102 },
  build: { outDir: "dist" },
  plugins: [react()],
});
