import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readme = await readFile(resolve(root, "README.md"), "utf8");
const failures: string[] = [];

for (const text of [
  "# MarkDrive",
  "Your Markdown, native in Drive.",
  "Manifest V3 Chrome Extension",
  "pnpm install",
  "pnpm generate:icons",
  "pnpm build",
  "Load `dist` as an unpacked extension",
  "Google Cloud Console",
  "Enable Google Drive API v3",
  "OAuth consent screen",
  "Chrome Extension",
  "MARKDRIVE_OAUTH_CLIENT_ID",
  "your-client-id.apps.googleusercontent.com"
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

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Documentation invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
