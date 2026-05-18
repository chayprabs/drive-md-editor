import type { DriveFile, DriveFolder, DriveFolderPathItem, MarkDriveSettings, OpenDocument } from "./types";

const validThemes = new Set(["dark", "light", "dracula", "nord", "solarized"]);
const validAutosaveIntervals = new Set([2000, 5000, 30000, 0]);

export type BackgroundRequest =
  | { type: "auth:get-token"; interactive: boolean }
  | { type: "drive:get-file"; fileId: string }
  | { type: "drive:save-file"; fileId: string; markdown: string; previousModifiedTime: string | null }
  | { type: "drive:create-file"; name: string; markdown: string; folderId: string | null }
  | { type: "drive:list-markdown"; folderId: string | null; query: string }
  | { type: "drive:list-folders"; folderId: string | null }
  | { type: "drive:get-folder-path"; folderId: string | null }
  | { type: "drive:rename-file"; fileId: string; name: string }
  | { type: "drive:trash-file"; fileId: string }
  | { type: "drive:upload-image"; name: string; mimeType: string; dataUrl: string; folderId: string | null }
  | { type: "settings:get" }
  | { type: "settings:update"; settings: Partial<MarkDriveSettings> }
  | { type: "app:open"; fileId: string | null; folderId: string | null };

export type BackgroundResponse =
  | { ok: true; token: string }
  | { ok: true; file: DriveFile; markdown: string }
  | { ok: true; document: OpenDocument }
  | { ok: true; files: DriveFile[] }
  | { ok: true; folders: DriveFolder[] }
  | { ok: true; path: DriveFolderPathItem[] }
  | { ok: true; settings: MarkDriveSettings }
  | { ok: true; imageMarkdown: string }
  | { ok: true }
  | { ok: false; status?: number; message: string; retryAfterMs?: number };

export async function sendMessage(request: BackgroundRequest): Promise<BackgroundResponse> {
  const response = await chrome.runtime.sendMessage(request) as unknown;
  if (isBackgroundResponse(request, response)) return response;
  throw new Error("MarkDrive background returned an invalid response.");
}

function isBackgroundResponse(request: BackgroundRequest, response: unknown): response is BackgroundResponse {
  if (!response || typeof response !== "object") return false;
  const record = response as Record<string, unknown>;
  if (record.ok === false) return typeof record.message === "string";
  if (record.ok !== true) return false;
  if (request.type === "auth:get-token") return typeof record.token === "string";
  if (request.type === "drive:get-file") return isDriveFile(record.file) && typeof record.markdown === "string";
  if (request.type === "drive:save-file" || request.type === "drive:create-file") return isOpenDocument(record.document);
  if (request.type === "drive:list-markdown") return isDriveFileArray(record.files);
  if (request.type === "drive:list-folders") return isDriveFolderArray(record.folders);
  if (request.type === "drive:get-folder-path") return isDriveFolderPath(record.path);
  if (request.type === "settings:get" || request.type === "settings:update") return isSettings(record.settings);
  if (request.type === "drive:upload-image") return typeof record.imageMarkdown === "string";
  return Object.keys(record).length === 1;
}

function isDriveFile(value: unknown): value is DriveFile {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    nonEmptyString(record.id) &&
    nonEmptyString(record.name) &&
    nonEmptyString(record.mimeType) &&
    validDateString(record.modifiedTime) &&
    optionalStringArray(record.parents) &&
    optionalString(record.webViewLink)
  );
}

function isOpenDocument(value: unknown): value is OpenDocument {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    nonEmptyString(record.name) &&
    typeof record.markdown === "string" &&
    optionalDriveId(record.fileId) &&
    optionalDateString(record.modifiedTime) &&
    optionalDriveId(record.folderId) &&
    typeof record.localVersion === "number" &&
    Number.isInteger(record.localVersion) &&
    record.localVersion >= 0
  );
}

function isDriveFolder(value: unknown): value is DriveFolder {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return nonEmptyString(record.id) && nonEmptyString(record.name) && optionalStringArray(record.parents);
}

function isDriveFileArray(value: unknown): value is DriveFile[] {
  return Array.isArray(value) && value.every(isDriveFile);
}

function isDriveFolderArray(value: unknown): value is DriveFolder[] {
  return Array.isArray(value) && value.every(isDriveFolder);
}

function isDriveFolderPath(value: unknown): value is DriveFolderPathItem[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return optionalDriveId(record.id) && nonEmptyString(record.name);
  });
}

function isSettings(value: unknown): value is MarkDriveSettings {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.theme === "string" &&
    validThemes.has(record.theme) &&
    typeof record.autosaveInterval === "number" &&
    validAutosaveIntervals.has(record.autosaveInterval) &&
    typeof record.vimMode === "boolean" &&
    typeof record.softWrap === "boolean" &&
    typeof record.onboardingComplete === "boolean" &&
    (typeof record.lastFolderId === "string" || record.lastFolderId === null)
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function optionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every(nonEmptyString));
}

function optionalDriveId(value: unknown): value is string | null {
  return value === null || nonEmptyString(value);
}

function validDateString(value: unknown): value is string {
  return nonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function optionalDateString(value: unknown): value is string | null {
  return value === null || validDateString(value);
}
