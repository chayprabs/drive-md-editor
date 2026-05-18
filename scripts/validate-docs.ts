import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readme = await readFile(resolve(root, "README.md"), "utf8");
const releaseChecklist = await readFile(resolve(root, "RELEASE_CHECKLIST.md"), "utf8");
const failures: string[] = [];

for (const text of [
  "# MarkDrive",
  "Your Markdown, native in Drive.",
  "Manifest V3 Chrome Extension",
  "pnpm install",
  "pnpm generate:icons",
  "pnpm build",
  "pnpm release:verify",
  "Load `dist` as an unpacked extension",
  "Google Cloud Console",
  "Enable Google Drive API v3",
  "OAuth consent screen",
  "Chrome Extension",
  "MARKDRIVE_OAUTH_CLIENT_ID",
  "Read-Host \"Chrome Extension OAuth client ID\""
]) {
  expect(readme.includes(text), `README missing required text: ${text}`);
}

for (const row of [
  "| Ctrl+S | Save to Drive |",
  "| Ctrl+B | Bold selection |",
  "| Ctrl+I | Italic selection |",
  "| Ctrl+K | Link selection |",
  "| Ctrl+Shift+F | Find and replace |",
  "| Ctrl+\\\\ | Toggle view |",
  "| F11 | Fullscreen |",
  "| :w | Save in Vim mode |"
]) {
  expect(readme.includes(row), `README shortcut table missing row: ${row}`);
}

for (const moduleName of ["manifest", "background", "content", "app", "options"]) {
  expect(readme.includes(`- \`${moduleName}\``), `README modules section missing ${moduleName}.`);
}

for (const text of [
  "Live Drive Verification",
  "production Chrome Extension OAuth client ID",
  "Google Drive grid view",
  "Google Drive list view",
  "Open with MarkDrive",
  "Ctrl+S",
  "without creating a duplicate",
  "5 second autosave",
  "conflict modal offers Keep Mine, Keep Drive, and Save as Copy",
  "Vim mode and `:w`",
  "current Drive folder",
  "Drive browser folder tree",
  "MarkDrive Images",
  "direct Drive image reference",
  "self-contained HTML",
  "Print to PDF",
  "Dark, Light, Dracula, Nord, and Solarized",
  "split, editor-only, preview-only",
  "release/live-drive-verification.json",
  "32-character Chrome `extensionId`",
  "Chrome or Edge `browser` with version",
  "not after the root completion time",
  "output/live",
  "Screenshots must be PNG, JPG, JPEG, or WebP files of at least 10 KB",
  "Markdown export evidence must be `.md` or `.txt` and at least 100 bytes",
  "PDF export evidence must be `.pdf` and at least 1 KB",
  "drive-grid-open",
  "ctrl-s-save-in-place",
  "layout-and-guards",
  "Tag `v1.0.0` only after every live Drive verification item above passes"
]) {
  expect(releaseChecklist.includes(text), `Release checklist missing required live QA text: ${text}`);
}

for (const forbidden of [
  ["your", "client", "id"].join("-") + ".apps.googleusercontent.com",
  ["production", "client"].join("-") + ".apps.googleusercontent.com",
  "loaded-chrome" + "-extension-id",
  ["qa", "owner"].join("-") + "@example.com",
  ["drive", "qa"].join("-") + "@example.com"
]) {
  expect(!readme.includes(forbidden), `README must not contain fake setup value: ${forbidden}`);
  expect(!releaseChecklist.includes(forbidden), `Release checklist must not contain fake setup value: ${forbidden}`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Documentation invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
