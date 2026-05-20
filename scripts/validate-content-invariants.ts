import { resolve } from "node:path";
import { readSource } from "./invariant-helpers";

const root = resolve(import.meta.dirname, "..");
const source = await readSource(resolve(root, "src/content/drive-interceptor.ts"));
const driveUrl = await readSource(resolve(root, "src/shared/drive-url.ts"));
const failures: string[] = [];

expect(source.includes("document.addEventListener(\"click\""), "Content script must intercept Drive click events.");
expect(source.includes("document.addEventListener(\"contextmenu\""), "Content script must capture Drive context menu targets.");
expect(source.includes("new MutationObserver(scheduleScan)"), "Content script must rescan dynamic Drive rows.");
expect(source.includes("window.requestAnimationFrame"), "Content script scans must be scheduled with requestAnimationFrame.");
expect(source.includes("const startedAt = performance.now()"), "Content script must time row scans.");
expect(source.includes("performance.now() - startedAt > 4"), "Content script must stop scans before the 5ms budget.");
expect(source.includes("document.querySelectorAll<HTMLElement>(\"a[href], [data-id][aria-label], [data-tooltip]\")"), "Content script must cover Drive grid and list candidates.");
expect(source.includes("import { isSupportedFileName } from \"../shared/file-types\";"), "Content script must centralize supported filename detection.");
expect(source.includes("function isSupportedDriveLabel"), "Content script must filter candidates to supported Drive file names.");
expect(source.includes("data-markdrive-supported"), "Content script must mark supported rows with data-markdrive-supported.");
expect(source.includes("isSupportedFileName(normalized)"), "Content script must filter candidates with shared file type helpers.");
expect(source.includes("dataset.markdriveSupported = \"true\""), "Content script must mark supported Drive rows.");
expect(source.includes("void openInMarkDrive(fileId, extractDriveFolderIdFromUrl(location.href))"), "Content script clicks must open MarkDrive with file and folder context.");
expect(source.includes("async function openInMarkDrive"), "Content script open action must handle runtime failures.");
expect(source.includes("showMarkDriveNotice(`MarkDrive could not open this file."), "Content script open failures must show user feedback in Drive.");
expect(source.includes("void captureContextTarget(fileId, extractDriveFolderIdFromUrl(location.href))"), "Content script context menu fallback must store the target in session storage.");
expect(source.includes("async function captureContextTarget"), "Context menu capture must handle storage failures.");
expect(source.includes("showMarkDriveNotice(`MarkDrive could not prepare the Drive context menu."), "Context menu capture failures must show user feedback in Drive.");
expect(source.includes("role\", \"alert\"") && source.includes("aria-live\", \"assertive\""), "Content script failures must be announced accessibly.");
expect(source.includes("extractDriveFileIdFromUrl(anchor.href) ?? extractFileIdFromElement(anchor)"), "Content script must resolve Drive file IDs from links and row metadata.");
expect(source.includes("import { cleanDriveId, extractDriveFileIdFromUrl, extractDriveFolderIdFromUrl }"), "Content script must share Drive ID cleanup with URL parsing.");
expect(source.includes("return cleanDriveId(host?.dataset.id ?? host?.dataset.target ?? host?.dataset.docId);"), "Content script must normalize DOM-provided Drive file IDs.");
expect(source.includes("extractDriveFolderIdFromUrl(location.href)"), "Content script must preserve the current Drive folder.");
expect(driveUrl.includes("export function extractDriveFileIdFromUrl"), "Shared Drive URL parser must expose file ID extraction.");
expect(driveUrl.includes("export function extractDriveFolderIdFromUrl"), "Shared Drive URL parser must expose folder ID extraction.");
expect(driveUrl.includes("export function cleanDriveId"), "Shared Drive URL parser must expose ID cleanup for DOM metadata.");
expect(driveUrl.includes("decodeURIComponent(value.trim())"), "Shared Drive URL parser must decode URL-encoded Drive IDs exactly once.");
expect(driveUrl.includes("export function isDriveResourceId"), "Shared Drive URL parser must expose Drive resource id validation.");
expect(driveUrl.includes("isDriveResourceId(decoded) ? decoded : null"), "Shared Drive URL parser must reject malformed Drive ids.");
expect(driveUrl.includes("[^/?#&]+") && driveUrl.includes("[?&]id=([^&#]+)"), "Shared Drive URL parser must strip query/hash fragments from fallback IDs.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Content script invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
