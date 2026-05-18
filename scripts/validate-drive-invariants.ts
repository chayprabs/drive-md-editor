import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, "src/background/drive-api.ts"), "utf8");
const driveNames = await readFile(resolve(root, "src/shared/drive-names.ts"), "utf8");
const failures: string[] = [];

expect(source.includes("import { normalizeDriveAssetName, normalizeMarkdownFileName } from \"../shared/drive-names\""), "Drive API must use shared Drive filename normalization.");
expect(driveNames.includes("export function normalizeMarkdownFileName"), "Shared Drive filename normalizer must exist.");
expect(driveNames.includes("export function normalizeDriveAssetName"), "Shared Drive asset filename normalizer must exist.");
expect(driveNames.includes("return \"Untitled.md\""), "Markdown filename normalization must reject empty names.");
expect(driveNames.includes("return fallback"), "Drive asset filename normalization must reject empty or reserved names.");
expect(driveNames.includes("/\\.md$/i.test(cleaned)"), "Markdown filename normalization must preserve existing .md extensions case-insensitively.");
expect(driveNames.includes("replace(/[\\x00-\\x1f<>:\"|?*]+/g, \"-\")"), "Markdown filename normalization must strip control and filesystem-reserved characters.");
expect(driveNames.includes("replace(/[\\\\/]+/g, \"-\")"), "Markdown filename normalization must strip path separators.");
expect(driveNames.includes("/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\\..*)?$/i.test(cleaned)"), "Drive asset filename normalization must reject reserved device names.");
expect(source.includes("function driveQueryLiteral"), "Drive API must centralize Drive query string escaping.");
expect(source.includes("value.replace(/\\\\/g, \"\\\\\\\\\")") && source.includes("replace(/'/g, \"\\\\'\")"), "Drive query literals must escape backslashes and apostrophes.");

const saveMarkdownFile = extractFunction("saveMarkdownFile");
expect(Boolean(saveMarkdownFile), "saveMarkdownFile must exist.");
if (saveMarkdownFile) {
  expect(saveMarkdownFile.includes("current.modifiedTime !== previousModifiedTime"), "saveMarkdownFile must compare Drive modifiedTime before writing.");
  expect(saveMarkdownFile.includes("DriveApiError(409"), "saveMarkdownFile must raise a 409 conflict when Drive changed.");
  expect(/`\$\{uploadBase\}\/files\/\$\{fileId\}\?uploadType=media/.test(saveMarkdownFile), "saveMarkdownFile must upload media to the existing fileId.");
  expect(/method:\s*"PATCH"/.test(saveMarkdownFile), "saveMarkdownFile must PATCH the existing Drive file.");
  expect(!/method:\s*"POST"/.test(saveMarkdownFile), "saveMarkdownFile must not POST, which would create a duplicate file.");
}

const createMarkdownFile = extractFunction("createMarkdownFile");
expect(Boolean(createMarkdownFile), "createMarkdownFile must exist.");
if (createMarkdownFile) {
  expect(createMarkdownFile.includes("name: normalizeMarkdownFileName(name)"), "createMarkdownFile must normalize Markdown file names.");
  expect(/`\$\{uploadBase\}\/files\?uploadType=multipart/.test(createMarkdownFile), "createMarkdownFile must use multipart upload.");
  expect(/method:\s*"POST"/.test(createMarkdownFile), "createMarkdownFile must POST only for new document creation.");
}

const renameFile = extractFunction("renameFile");
expect(Boolean(renameFile), "renameFile must exist.");
if (renameFile) {
  expect(renameFile.includes("name: normalizeMarkdownFileName(name)"), "renameFile must normalize Markdown file names.");
}

const listMarkdownFiles = extractFunction("listMarkdownFiles");
expect(Boolean(listMarkdownFiles), "listMarkdownFiles must exist.");
if (listMarkdownFiles) {
  expect(listMarkdownFiles.includes("driveQueryLiteral(\".md\")"), "Markdown file listing must quote the .md query literal through the shared helper.");
  expect(listMarkdownFiles.includes("driveQueryLiteral(folderId)"), "Markdown file listing must quote folder ids through the shared helper.");
  expect(listMarkdownFiles.includes("driveQueryLiteral(query.trim())"), "Markdown file search must quote user search text through the shared helper.");
}

const listFolders = extractFunction("listFolders");
expect(Boolean(listFolders), "listFolders must exist.");
if (listFolders) {
  expect(listFolders.includes("driveQueryLiteral(parent)"), "Folder listing must quote parent ids through the shared helper.");
}

const uploadImage = extractFunction("uploadImage");
expect(Boolean(uploadImage), "uploadImage must exist.");
if (uploadImage) {
  expect(uploadImage.includes("ensureImagesFolder"), "uploadImage must create or reuse the MarkDrive Images folder.");
  expect(uploadImage.includes("name: normalizeDriveAssetName(name)"), "uploadImage must normalize asset names before creating Drive files.");
  expect(uploadImage.includes("https://drive.google.com/uc?export=view&id="), "uploadImage must insert a direct Drive image reference.");
}

const ensureImagesFolder = extractFunction("ensureImagesFolder", false);
expect(Boolean(ensureImagesFolder), "ensureImagesFolder must exist.");
if (ensureImagesFolder) {
  expect(ensureImagesFolder.includes("driveQueryLiteral(\"MarkDrive Images\")"), "MarkDrive Images lookup must quote folder name through the shared helper.");
  expect(ensureImagesFolder.includes("driveQueryLiteral(parent)"), "MarkDrive Images lookup must quote parent ids through the shared helper.");
  expect(ensureImagesFolder.includes("files(id,name,parents)"), "Existing MarkDrive Images folder lookup must request parent metadata.");
  expect(ensureImagesFolder.includes("encodeURIComponent(\"id,name,parents\")"), "Created MarkDrive Images folder must return parent metadata.");
  expect(ensureImagesFolder.includes("parents: [parent]"), "Created MarkDrive Images folder must be placed in the current Drive folder.");
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Drive API invariants passed.");

function extractFunction(name: string, exported = true): string | null {
  const start = source.indexOf(`${exported ? "export " : ""}async function ${name}`);
  if (start === -1) return null;

  const bodyStart = source.indexOf("{", start);
  if (bodyStart === -1) return null;

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  return null;
}

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
