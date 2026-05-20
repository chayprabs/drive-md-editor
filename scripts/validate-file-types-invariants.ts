import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fileTypes = await readFile(resolve(root, "src/shared/file-types.ts"), "utf8");
const driveNames = await readFile(resolve(root, "src/shared/drive-names.ts"), "utf8");
const driveApi = await readFile(resolve(root, "src/background/drive-api.ts"), "utf8");
const app = await readFile(resolve(root, "src/app/main.tsx"), "utf8");
const editor = await readFile(resolve(root, "src/app/markdown-editor.tsx"), "utf8");
const sidebar = await readFile(resolve(root, "src/app/sidebar.tsx"), "utf8");
const content = await readFile(resolve(root, "src/content/drive-interceptor.ts"), "utf8");
const css = await readFile(resolve(root, "src/app/styles.css"), "utf8");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
};
const failures: string[] = [];

expect(fileTypes.includes("export type MarkDriveFileKind = \"markdown\" | \"text\" | \"json\""), "Shared file types must define MarkDriveFileKind.");
for (const helper of [
  "fileKindFromName",
  "isSupportedFileName",
  "fileKindLabel",
  "mimeTypeForFileName",
  "defaultFileNameForKind",
  "defaultContentForKind",
  "normalizeSupportedFileName",
  "duplicateFileName",
  "driveNameContainsClauses",
  "jsonSyntaxStatus"
]) {
  expect(fileTypes.includes(`export function ${helper}`), `Shared file types must export ${helper}.`);
}

expect(driveNames.includes("export function normalizeDriveFileName"), "Drive names must expose normalizeDriveFileName.");
expect(driveApi.includes("driveNameContainsClauses"), "Drive API must list all supported extensions.");
expect(driveApi.includes("mimeTypeForFileName"), "Drive API must resolve MIME types from file names.");
expect(driveApi.includes("isSupportedFileName"), "Drive API must filter listed files with isSupportedFileName.");
expect(content.includes("isSupportedDriveLabel"), "Content script must expose isSupportedDriveLabel.");
expect(content.includes("dataset.markdriveSupported"), "Content script must mark supported rows in the DOM.");
expect(content.includes("data-markdrive-supported"), "Content script must set data-markdrive-supported on context targets.");

expect(app.includes("fileKindFromName"), "App must derive file kind from the open document name.");
expect(app.includes("previewEnabled"), "App must derive preview availability from file kind.");
expect(app.includes("jsonSyntaxStatus"), "App must validate JSON syntax in the status bar.");
expect(app.includes("duplicateFileName"), "App must name conflict copies with duplicateFileName.");
expect(app.includes("documentMode={fileKind}"), "App must pass document mode to the editor.");
expect(editor.includes("documentMode: MarkDriveFileKind"), "Editor must accept document mode.");
expect(sidebar.includes("normalizeSupportedFileName"), "Sidebar must normalize supported file names.");
expect(sidebar.includes("newFileKind"), "Sidebar must let users choose a new file kind.");

expect(css.includes(".file-kind-badge"), "Styles must include a file kind badge.");
expect(css.includes(".json-status.invalid"), "Styles must highlight invalid JSON status.");
expect(Boolean(packageJson.dependencies?.["@codemirror/lang-json"]), "Package manifest must include @codemirror/lang-json.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("File type invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
