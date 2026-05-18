import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, "src/background/drive-api.ts"), "utf8");
const failures: string[] = [];

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
  expect(/`\$\{uploadBase\}\/files\?uploadType=multipart/.test(createMarkdownFile), "createMarkdownFile must use multipart upload.");
  expect(/method:\s*"POST"/.test(createMarkdownFile), "createMarkdownFile must POST only for new document creation.");
}

const uploadImage = extractFunction("uploadImage");
expect(Boolean(uploadImage), "uploadImage must exist.");
if (uploadImage) {
  expect(uploadImage.includes("ensureImagesFolder"), "uploadImage must create or reuse the MarkDrive Images folder.");
  expect(uploadImage.includes("https://drive.google.com/uc?export=view&id="), "uploadImage must insert a direct Drive image reference.");
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Drive API invariants passed.");

function extractFunction(name: string): string | null {
  const start = source.indexOf(`export async function ${name}`);
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
