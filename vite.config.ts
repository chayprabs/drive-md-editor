import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { manifest } from "./src/manifest";

export default defineConfig({
  plugins: [katexWoff2Only(), react(), crx({ manifest })],
  build: {
    modulePreload: false,
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      input: {
        app: resolve(__dirname, "index.html"),
        options: resolve(__dirname, "options.html")
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react";
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

function katexWoff2Only(): Plugin {
  return {
    name: "markdrive-katex-woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("katex.min.css")) return null;
      return code
        .replace(/,url\(fonts\/KaTeX_[^)]+\.woff\) format\("woff"\)/g, "")
        .replace(/,url\(fonts\/KaTeX_[^)]+\.ttf\) format\("truetype"\)/g, "");
    }
  };
}
