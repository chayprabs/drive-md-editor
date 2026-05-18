import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const storeListing = await readFile(resolve(root, "STORE_LISTING.md"), "utf8");
const privacy = await readFile(resolve(root, "PRIVACY.md"), "utf8");
const manifestSource = await readFile(resolve(root, "src", "manifest.ts"), "utf8");
const failures: string[] = [];

for (const text of [
  "# MarkDrive Chrome Web Store Listing",
  "Edit, preview, and save Markdown files directly in Google Drive.",
  "Open `.md` files from Drive",
  "Live Markdown preview",
  "Mermaid diagrams",
  "KaTeX math",
  "syntax highlighting",
  "manual save, autosave, offline retry, and conflict resolution",
  "Drive browser with folder navigation",
  "image paste upload",
  "Export Markdown, HTML, and print-ready PDF",
  "Themes for dark, light, Dracula, Nord, and Solarized"
]) {
  expect(storeListing.includes(text), `Store listing missing required product copy: ${text}`);
}

for (const permission of ["identity", "storage", "tabs", "alarms", "contextMenus", "scripting"]) {
  expect(manifestSource.includes(`"${permission}"`), `Manifest missing permission: ${permission}`);
  expect(storeListing.includes(`- \`${permission}\``), `Store listing missing rationale for permission: ${permission}`);
}

for (const hostPermission of ["https://www.googleapis.com/*", "https://drive.google.com/*"]) {
  expect(manifestSource.includes(`"${hostPermission}"`), `Manifest missing host permission: ${hostPermission}`);
  expect(storeListing.includes(`- \`${hostPermission}\``), `Store listing missing rationale for host permission: ${hostPermission}`);
}

for (const text of [
  "# MarkDrive Privacy Policy",
  "Effective date: May 19, 2026",
  "Markdown files you open or save through Google Drive",
  "File metadata needed to show names, folders, modified times, and recent files",
  "Images you paste or drop into the editor",
  "Local settings",
  "Local offline save drafts",
  "sent to Google Drive APIs only to perform the action you requested",
  "stored locally in Chrome extension storage",
  "does not sell data, serve ads, track browsing for advertising, or send document content to analytics services",
  "shared with Google Drive APIs only as required for Drive editing features",
  "Offline drafts are removed after they sync successfully",
  "revoke MarkDrive's Google account access"
]) {
  expect(privacy.includes(text), `Privacy policy missing required disclosure: ${text}`);
}

for (const forbidden of ["analytics", "advertising", "ads"]) {
  const onlyNegativeDisclosure = new RegExp(`does not[^.]*${forbidden}`, "i").test(storeListing) || new RegExp(`does not[^.]*${forbidden}`, "i").test(privacy);
  expect(onlyNegativeDisclosure, `Any ${forbidden} mention must be a negative disclosure.`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Store listing and privacy invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
