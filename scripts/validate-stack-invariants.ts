import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const tsconfig = JSON.parse(await readFile(resolve(root, "tsconfig.json"), "utf8")) as {
  compilerOptions?: Record<string, unknown>;
};
const viteConfig = await readFile(resolve(root, "vite.config.ts"), "utf8");
const manifest = await readFile(resolve(root, "src/manifest.ts"), "utf8");
const failures: string[] = [];

const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
const requiredPackages = [
  "typescript",
  "vite",
  "@crxjs/vite-plugin",
  "@vitejs/plugin-react",
  "react",
  "react-dom",
  "codemirror",
  "@codemirror/commands",
  "@codemirror/lang-markdown",
  "@codemirror/language",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@replit/codemirror-vim",
  "markdown-it",
  "markdown-it-anchor",
  "markdown-it-container",
  "markdown-it-emoji",
  "markdown-it-footnote",
  "markdown-it-mark",
  "markdown-it-sub",
  "markdown-it-sup",
  "markdown-it-task-lists",
  "highlight.js",
  "katex",
  "mermaid",
  "gray-matter",
  "turndown",
  "pnpm"
];

for (const pkg of requiredPackages) {
  if (pkg === "pnpm") {
    expect(packageJson.scripts?.build?.includes("vite build") && packageJson.scripts.check?.includes("scripts/check.ts"), "Project must use pnpm scripts for build/check.");
    continue;
  }
  expect(Boolean(dependencies[pkg]), `Required stack package missing: ${pkg}`);
}

expect(tsconfig.compilerOptions?.strict === true, "TypeScript strict mode must be enabled.");
expect(tsconfig.compilerOptions?.allowJs === false, "JavaScript source files must be disabled.");
expect(tsconfig.compilerOptions?.noEmit === true, "TypeScript must type-check without emitting.");
expect(tsconfig.compilerOptions?.moduleResolution === "Bundler", "TypeScript must use bundler module resolution.");
expect(tsconfig.compilerOptions?.types instanceof Array && tsconfig.compilerOptions.types.includes("chrome"), "Chrome extension types must be enabled.");

expect(viteConfig.includes("import { crx } from \"@crxjs/vite-plugin\""), "Vite config must use CRXJS.");
expect(viteConfig.includes("crx({ manifest })"), "Vite config must build the Chrome extension manifest.");
expect(viteConfig.includes("react()"), "Vite config must include React.");

expect(manifest.includes("manifest_version: 3"), "Manifest must be MV3.");
expect(manifest.includes("background:") && manifest.includes("service_worker"), "Manifest must define a service worker.");
expect(manifest.includes("type: \"module\""), "Manifest service worker must be a module.");
expect(manifest.includes("permissions: [\"identity\", \"storage\", \"tabs\", \"alarms\", \"contextMenus\", \"scripting\"]"), "Manifest must request the expected Chrome permissions.");
expect(manifest.includes("host_permissions: [\"https://www.googleapis.com/*\", \"https://drive.google.com/*\"]"), "Manifest must request Drive and Google API host permissions.");
expect(manifest.includes("oauth2:"), "Manifest must define OAuth2.");
expect(manifest.includes("https://www.googleapis.com/auth/drive.file"), "Manifest must request Drive file scope.");
expect(manifest.includes("https://www.googleapis.com/auth/drive.metadata.readonly"), "Manifest must request Drive metadata scope.");
expect(manifest.includes("content_scripts:"), "Manifest must register the Drive content script.");
expect(manifest.includes("https://drive.google.com/drive/*") && manifest.includes("https://drive.google.com/file/*"), "Manifest must match Drive URLs.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Stack invariants passed.");

function expect(condition: boolean | undefined, message: string): void {
  if (!condition) failures.push(message);
}
