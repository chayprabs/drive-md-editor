import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readSource } from "./invariant-helpers";

const root = resolve(import.meta.dirname, "..");
const preview = await readSource(resolve(root, "src/app/preview-pane.tsx"));
const viteConfig = await readSource(resolve(root, "vite.config.ts"));
const bundleGate = await readSource(resolve(root, "scripts/assert-bundle-size.ts"));
const contentGate = await readSource(resolve(root, "scripts/validate-content-invariants.ts"));
const failures: string[] = [];

expect(preview.includes("window.setTimeout(() => setPreviewMarkdown(markdown), 50)"), "Preview markdown updates must be debounced to 50ms.");
expect(preview.includes("window.setTimeout(() => {") && preview.includes("hydrateMathAndDiagrams(host, theme, onHydrationError, isCurrentHydration)"), "Preview hydration must be debounced after render.");
expect(preview.includes("}, printRequestId > 0 ? 0 : 50);"), "PDF print requests must bypass the preview hydration debounce.");
expect(preview.includes("await import(\"katex/dist/katex.min.css\")"), "KaTeX CSS must be lazy-loaded.");
expect(preview.includes("const katex = await import(\"katex\")"), "KaTeX runtime must be lazy-loaded.");
expect(preview.includes("const mermaid = await import(\"mermaid\")"), "Mermaid runtime must be lazy-loaded.");
expect(preview.includes("await import(\"highlight.js/styles/github-dark.css\")"), "Highlight CSS must be lazy-loaded.");
expect(preview.includes("const hljs = await import(\"./highlight-languages\")"), "Highlight language registry must be lazy-loaded.");
expect(
  preview.includes("await hydrateCode(host, onHydrationError, isCurrentHydration);")
    || preview.includes("await hydrateCode(host, theme, onHydrationError, isCurrentHydration);"),
  "Highlight hydration must stay inside the debounced preview hydration path."
);
expect(preview.includes("if (mathNodes.length > 0)"), "KaTeX must load only when math nodes exist.");
expect(preview.includes("if (diagramNodes.length > 0)"), "Mermaid must load only when diagram nodes exist.");
expect(preview.includes("if (codeNodes.length === 0) return;"), "Highlight assets must load only when code blocks exist.");
expect(preview.includes("(?:[-*+]|\\d+[.)])"), "Preview checkbox sync must support bullet and ordered task list markers.");
expect(preview.includes("if (previewMarkdown !== markdown) return;"), "Preview checkbox sync must ignore stale rendered previews during the debounce window.");
expect(preview.includes("securityLevel: \"strict\""), "Mermaid rendering must use strict security mode.");

expect(viteConfig.includes("sourcemap: false"), "Production builds must disable source maps.");
expect(viteConfig.includes("modulePreload: false"), "Extension build must disable modulepreload injection.");
expect(viteConfig.includes("target: \"es2022\""), "Build target must be modern enough for MV3.");
for (const chunk of ["react", "mermaid", "katex", "highlight", "editor"]) {
  expect(viteConfig.includes(`return "${chunk}"`), `Build must split ${chunk} into its own chunk.`);
}
expect(viteConfig.includes("katexWoff2Only()"), "Build must strip heavier KaTeX font formats.");
expect(viteConfig.includes(".replace(/,url\\(fonts\\/KaTeX_[^)]+\\.woff\\)"), "Build must strip KaTeX woff fonts.");
expect(viteConfig.includes(".replace(/,url\\(fonts\\/KaTeX_[^)]+\\.ttf\\)"), "Build must strip KaTeX ttf fonts.");

expect(bundleGate.includes("const maxBytes = 5 * 1024 * 1024"), "Bundle gate must enforce the 5MB budget.");
expect(bundleGate.includes("directorySize(dist)"), "Bundle gate must measure the built extension directory.");
expect(contentGate.includes("performance.now() - startedAt > 4"), "Content script gate must enforce a scan cutoff below 5ms.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Performance invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
