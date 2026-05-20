import { resolve } from "node:path";
import { readSource } from "./invariant-helpers";

const root = resolve(import.meta.dirname, "..");
const app = await readSource(resolve(root, "src/app/main.tsx"));
const modal = await readSource(resolve(root, "src/app/conflict-modal.tsx"));
const driveApi = await readSource(resolve(root, "src/background/drive-api.ts"));
const failures: string[] = [];

expect(driveApi.includes("current.modifiedTime !== previousModifiedTime"), "Drive save must compare modifiedTime before writing.");
expect(driveApi.includes("throw new DriveApiError(409"), "Drive save must raise a 409 conflict.");
expect(driveApi.includes("JSON.stringify({ modifiedTime: drive.file.modifiedTime, markdown: drive.markdown })"), "409 conflict must carry Drive markdown and modifiedTime.");
expect(driveApi.includes("method: \"PATCH\""), "Conflict-aware save must still PATCH the existing file.");

expect(app.includes("response.status === 409"), "App must branch on Drive conflict responses.");
expect(app.includes("const drive = parseConflictPayload(response.message)"), "App must parse the conflict payload through a validator.");
expect(app.includes("function parseConflictPayload(message: string): { markdown: string; modifiedTime: string } | null"), "Conflict payload parsing must be centralized.");
expect(app.includes("typeof parsed.markdown !== \"string\""), "Conflict payload parsing must validate Drive markdown.");
expect(app.includes("!Number.isFinite(Date.parse(parsed.modifiedTime))"), "Conflict payload parsing must validate Drive modifiedTime.");
expect(app.includes("title: \"Save conflict failed\""), "Malformed conflict payloads must show specific user feedback.");
expect(app.includes("setConflict({ local: target, drive })"), "App must preserve both local and Drive conflict versions.");
expect(app.includes("setSaveState(\"error\")"), "App must mark conflict saves as requiring attention.");
expect(app.includes("<ConflictModal"), "App must render the conflict modal.");
expect(app.includes("setConflict({ local: item.document, drive })"), "Queued offline retry conflicts must open the same conflict resolver.");
expect(app.includes("title: \"Queued save needs review\""), "Queued offline retry conflicts must show user feedback.");
expect(app.includes("title: \"Queued save conflict failed\""), "Malformed queued conflict payloads must show specific user feedback.");
expect(app.includes("title: \"Queued conflict saved locally\""), "Queued conflict removal failures must explain that the local save remains queued.");

expect(modal.includes("Drive changed this file"), "Conflict modal must explain that Drive changed the file.");
expect(modal.includes("Keep Mine"), "Conflict modal must offer Keep Mine.");
expect(modal.includes("Keep Drive"), "Conflict modal must offer Keep Drive.");
expect(modal.includes("Save as Copy"), "Conflict modal must offer Save as Copy.");
expect(modal.includes("changed lines"), "Conflict modal must summarize changed lines.");
expect(modal.includes("local words"), "Conflict modal must summarize local words.");
expect(modal.includes("Drive words"), "Conflict modal must summarize Drive words.");
expect(modal.includes("Local Draft"), "Conflict modal must preview the local draft.");
expect(modal.includes("Drive Version"), "Conflict modal must preview the Drive version.");

expect(app.includes("const local = { ...conflict.local, modifiedTime: conflict.drive.modifiedTime }"), "Keep Mine must save the local draft against the latest Drive modifiedTime.");
expect(app.includes("void saveCurrent(\"manual\", local)"), "Keep Mine must retry the save.");
expect(app.includes("setDocument({ ...conflict.local, markdown: conflict.drive.markdown, modifiedTime: conflict.drive.modifiedTime })"), "Keep Drive must replace the editor contents with the Drive version.");
expect(app.includes("dirtyRef.current = false"), "Keep Drive must clear the dirty flag.");
expect(app.includes("setSaveState(\"saved\")"), "Keep Drive must leave the document saved.");
expect(app.includes("const copy = { ...conflict.local, fileId: null, modifiedTime: null"), "Save as Copy must create a new file target.");
expect(app.includes("name: duplicateFileName(conflict.local.name)"), "Save as Copy must name the copy distinctly.");
expect(app.includes("void saveCurrent(\"manual\", copy)"), "Save as Copy must save the copy.");
expect(app.includes("setConflict(null)"), "All conflict actions must close the modal.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Conflict invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
