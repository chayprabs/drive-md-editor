import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const examplePath = resolve(root, "release", "live-drive-verification.example.json");
const outputLiveDir = resolve(root, "output", "live");

const requiredChecks = [
  "drive-grid-open",
  "drive-list-open",
  "drive-context-open",
  "ctrl-s-save-in-place",
  "autosave-in-place",
  "conflict-modal",
  "vim-w-save",
  "new-file-current-folder",
  "drive-browser",
  "image-upload",
  "export-markdown",
  "export-html",
  "export-pdf",
  "themes",
  "layout-and-guards"
] as const;

const evidenceByCheck: Record<(typeof requiredChecks)[number], string> = {
  "drive-grid-open": "output/live/drive-grid-open.png",
  "drive-list-open": "output/live/drive-list-open.png",
  "drive-context-open": "output/live/drive-context-open.png",
  "ctrl-s-save-in-place": "output/live/ctrl-s-save-in-place.png",
  "autosave-in-place": "output/live/autosave-in-place.png",
  "conflict-modal": "output/live/conflict-modal.png",
  "vim-w-save": "output/live/vim-w-save.png",
  "new-file-current-folder": "output/live/new-file-current-folder.png",
  "drive-browser": "output/live/drive-browser.png",
  "image-upload": "output/live/image-upload.png",
  "export-markdown": "output/live/export-markdown.md",
  "export-html": "output/live/export-markdown.html",
  "export-pdf": "output/live/export-markdown.pdf",
  themes: "output/live/themes.png",
  "layout-and-guards": "output/live/layout-and-guards.png"
};

const template = {
  _notice: "TEMPLATE ONLY. Replace every placeholder, add real files under output/live, then copy to release/live-drive-verification.json. pnpm release:verify rejects this file as-is.",
  clientId: "REPLACE-WITH-PRODUCTION-CLIENT-ID.apps.googleusercontent.com",
  extensionId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  tester: "replace-with-your-email@your-domain.com",
  browser: "Chrome 0.0.0.0",
  driveAccount: "replace-with-drive-account@your-domain.com",
  completedAt: "1970-01-01T00:00:00.000Z",
  checks: requiredChecks.map((id) => ({
    id,
    result: "pass",
    completedAt: "1970-01-01T00:00:00.000Z",
    evidence: evidenceByCheck[id]
  }))
};

mkdirSync(resolve(root, "release"), { recursive: true });
mkdirSync(outputLiveDir, { recursive: true });
writeFileSync(examplePath, `${JSON.stringify(template, null, 2)}\n`, "utf8");

console.log(`Wrote ${examplePath}`);
console.log(`Ensured ${outputLiveDir} exists.`);
console.log("Next steps:");
console.log("1. Complete docs/live-qa-guide.md in Chrome with production OAuth.");
console.log("2. Save real screenshots and exports under output/live/.");
console.log("3. Copy the example file to release/live-drive-verification.json and replace placeholders.");
console.log("4. Run MARKDRIVE_OAUTH_CLIENT_ID=<client-id> pnpm release:verify");
