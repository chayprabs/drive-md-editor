import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { manifest } from "./src/manifest";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    sourcemap: true,
    target: "es2022",
    rollupOptions: {
      input: {
        app: resolve(__dirname, "index.html"),
        options: resolve(__dirname, "options.html")
      },
      output: {
        manualChunks(id) {
          if (id.includes("mermaid")) return "mermaid";
          if (id.includes("katex")) return "katex";
          if (id.includes("highlight.js")) return "highlight";
          if (id.includes("codemirror") || id.includes("@codemirror")) return "editor";
          return undefined;
        }
      }
    }
  }
});
