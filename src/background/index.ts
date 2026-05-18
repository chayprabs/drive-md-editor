import {
  createMarkdownFile,
  DriveApiError,
  getFolderPath,
  getMarkdownFile,
  listFolders,
  listMarkdownFiles,
  renameFile,
  saveMarkdownFile,
  trashFile,
  uploadImage
} from "./drive-api";
import type { BackgroundRequest, BackgroundResponse } from "../shared/messages";
import type { MarkDriveSettings } from "../shared/types";
import { cleanDriveId, extractDriveFileIdFromUrl } from "../shared/drive-url";
import { loadSettings, updateSettings } from "../shared/settings";

const validSettingsKeys = new Set(["theme", "autosaveInterval", "vimMode", "softWrap", "lastFolderId", "onboardingComplete"]);
const validSettingsThemes = new Set(["dark", "light", "dracula", "nord", "solarized"]);
const validSettingsAutosaveIntervals = new Set([2000, 5000, 30000, 0]);

chrome.runtime.onInstalled.addListener(({ reason }) => {
  void initializeExtension(reason);
});

chrome.action.onClicked.addListener(() => {
  void runBackgroundAction(() => openEditor(null, null));
});
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-markdrive") void runBackgroundAction(() => openEditor(null, null));
});
chrome.contextMenus.onClicked.addListener((info) => {
  void runBackgroundAction(() => openFromContext(info.linkUrl ?? info.pageUrl ?? ""));
});

async function initializeExtension(reason: chrome.runtime.InstalledDetails["reason"]): Promise<void> {
  await runBackgroundAction(async () => {
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: "markdrive-open",
      title: "Open with MarkDrive",
      contexts: ["link", "page"],
      documentUrlPatterns: ["https://drive.google.com/*"]
    });

    if (reason === "install") {
      await chrome.tabs.create({ url: chrome.runtime.getURL("index.html?onboarding=1") });
    }
  });
}

chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
  void handleMessage(request).then(sendResponse);
  return true;
});

async function handleMessage(request: unknown): Promise<BackgroundResponse> {
  let token: string | null = null;
  try {
    if (!isBackgroundRequest(request)) return { ok: false, status: 400, message: "Invalid MarkDrive request." };
    if (request.type === "settings:get") return { ok: true, settings: await loadSettings() };
    if (request.type === "settings:update") return { ok: true, settings: await updateSettings(request.settings) };
    if (request.type === "app:open") {
      await openEditor(request.fileId, request.folderId);
      return { ok: true };
    }

    token = await getAuthToken(request.type === "auth:get-token" ? request.interactive : true);
    if (request.type === "auth:get-token") return { ok: true, token };
    if (request.type === "drive:get-file") return { ok: true, ...(await getMarkdownFile(token, request.fileId)) };
    if (request.type === "drive:save-file") {
      return {
        ok: true,
        document: await saveMarkdownFile(token, request.fileId, request.markdown, request.previousModifiedTime)
      };
    }
    if (request.type === "drive:create-file") {
      return {
        ok: true,
        document: await createMarkdownFile(token, request.name, request.markdown, request.folderId)
      };
    }
    if (request.type === "drive:list-markdown") {
      return { ok: true, files: await listMarkdownFiles(token, request.folderId, request.query) };
    }
    if (request.type === "drive:list-folders") {
      return { ok: true, folders: await listFolders(token, request.folderId) };
    }
    if (request.type === "drive:get-folder-path") {
      return { ok: true, path: await getFolderPath(token, request.folderId) };
    }
    if (request.type === "drive:rename-file") {
      await renameFile(token, request.fileId, request.name);
      return { ok: true };
    }
    if (request.type === "drive:trash-file") {
      await trashFile(token, request.fileId);
      return { ok: true };
    }
    if (request.type === "drive:upload-image") {
      return {
        ok: true,
        imageMarkdown: await uploadImage(token, request.name, request.mimeType, request.dataUrl, request.folderId)
      };
    }
    return { ok: false, message: "Unsupported MarkDrive request" };
  } catch (error) {
    if (token && error instanceof DriveApiError && error.status === 401) await forgetAuthToken(token);
    return toResponseError(error);
  }
}

function isBackgroundRequest(request: unknown): request is BackgroundRequest {
  if (!request || typeof request !== "object") return false;
  const record = request as Record<string, unknown>;
  if (record.type === "auth:get-token") return typeof record.interactive === "boolean";
  if (record.type === "drive:get-file") return nonEmptyString(record.fileId);
  if (record.type === "drive:save-file") {
    return nonEmptyString(record.fileId) && typeof record.markdown === "string" && optionalDateString(record.previousModifiedTime);
  }
  if (record.type === "drive:create-file") {
    return nonEmptyString(record.name) && typeof record.markdown === "string" && optionalDriveId(record.folderId);
  }
  if (record.type === "drive:list-markdown") {
    return optionalDriveId(record.folderId) && typeof record.query === "string";
  }
  if (record.type === "drive:list-folders" || record.type === "drive:get-folder-path") {
    return optionalDriveId(record.folderId);
  }
  if (record.type === "drive:rename-file") return nonEmptyString(record.fileId) && nonEmptyString(record.name);
  if (record.type === "drive:trash-file") return nonEmptyString(record.fileId);
  if (record.type === "drive:upload-image") {
    return nonEmptyString(record.name) && nonEmptyString(record.mimeType) && nonEmptyString(record.dataUrl) && optionalDriveId(record.folderId);
  }
  if (record.type === "settings:get") return true;
  if (record.type === "settings:update") return isSettingsUpdate(record.settings);
  if (record.type === "app:open") return optionalDriveId(record.fileId) && optionalDriveId(record.folderId);
  return false;
}

function isSettingsUpdate(value: unknown): value is Partial<MarkDriveSettings> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (!Object.keys(record).every((key) => validSettingsKeys.has(key))) return false;
  return (
    (record.theme === undefined || (typeof record.theme === "string" && validSettingsThemes.has(record.theme))) &&
    (record.autosaveInterval === undefined || (typeof record.autosaveInterval === "number" && validSettingsAutosaveIntervals.has(record.autosaveInterval))) &&
    (record.vimMode === undefined || typeof record.vimMode === "boolean") &&
    (record.softWrap === undefined || typeof record.softWrap === "boolean") &&
    (record.lastFolderId === undefined || optionalDriveId(record.lastFolderId)) &&
    (record.onboardingComplete === undefined || typeof record.onboardingComplete === "boolean")
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalDriveId(value: unknown): value is string | null {
  return value === null || nonEmptyString(value);
}

function optionalDateString(value: unknown): value is string | null {
  return value === null || (nonEmptyString(value) && Number.isFinite(Date.parse(value)));
}

async function getAuthToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError || !token) {
        reject(new DriveApiError(401, runtimeError?.message ?? "Google authentication failed"));
        return;
      }
      const value = typeof token === "string" ? token : token.token;
      if (!value) {
        reject(new DriveApiError(401, "Google authentication did not return a token"));
        return;
      }
      resolve(value);
    });
  });
}

async function forgetAuthToken(token: string): Promise<void> {
  await chrome.identity.removeCachedAuthToken({ token }).catch(() => undefined);
}

async function openEditor(fileId: string | null, folderId: string | null): Promise<void> {
  const cleanFileId = cleanDriveId(fileId);
  const cleanFolderId = cleanDriveId(folderId);
  const params = new URLSearchParams();
  if (cleanFileId) params.set("fileId", cleanFileId);
  if (cleanFolderId) params.set("folderId", cleanFolderId);
  await chrome.tabs.create({ url: chrome.runtime.getURL(`index.html${params.size ? `?${params.toString()}` : ""}`) });
  clearBackgroundFailure();
}

async function openFromContext(url: string): Promise<void> {
  const fileId = extractDriveFileIdFromUrl(url);
  if (fileId) {
    await openEditor(fileId, null);
    return;
  }

  const stored = await chrome.storage.session.get("markdrive.contextTarget");
  const target = stored["markdrive.contextTarget"] as { fileId?: unknown; folderId?: unknown; capturedAt?: unknown } | undefined;
  const fresh = typeof target?.capturedAt === "number" && Date.now() - target.capturedAt < 30_000;
  const storedFileId = typeof target?.fileId === "string" ? cleanDriveId(target.fileId) : null;
  const storedFolderId = typeof target?.folderId === "string" ? cleanDriveId(target.folderId) : null;
  if (fresh && storedFileId) {
    await openEditor(storedFileId, storedFolderId);
    return;
  }

  await openEditor(null, null);
}

function toResponseError(error: unknown): BackgroundResponse {
  if (error instanceof DriveApiError) {
    return { ok: false, status: error.status, message: error.message, retryAfterMs: error.retryAfterMs };
  }
  if (error instanceof TypeError) {
    return { ok: false, status: 0, message: "Network request failed. MarkDrive will queue the save locally." };
  }
  return { ok: false, message: error instanceof Error ? error.message : "Unexpected MarkDrive error" };
}

async function runBackgroundAction(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (failure) {
    reportBackgroundFailure(failure);
  }
}

function reportBackgroundFailure(failure: unknown): void {
  const message = failure instanceof Error ? failure.message : "Unexpected MarkDrive background failure";
  void Promise.all([
    chrome.action.setBadgeText({ text: "!" }),
    chrome.action.setBadgeBackgroundColor({ color: "#dc2626" }),
    chrome.action.setTitle({ title: `MarkDrive error: ${message}` })
  ]).catch(() => undefined);
}

function clearBackgroundFailure(): void {
  void Promise.all([
    chrome.action.setBadgeText({ text: "" }),
    chrome.action.setTitle({ title: "MarkDrive" })
  ]).catch(() => undefined);
}
