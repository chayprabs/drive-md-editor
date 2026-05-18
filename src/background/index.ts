import {
  createMarkdownFile,
  DriveApiError,
  getMarkdownFile,
  listMarkdownFiles,
  renameFile,
  saveMarkdownFile,
  trashFile,
  uploadImage
} from "./drive-api";
import type { BackgroundRequest, BackgroundResponse } from "../shared/messages";
import { loadSettings, updateSettings } from "../shared/settings";

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
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

chrome.action.onClicked.addListener(() => openEditor(null, null));
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-markdrive") void openEditor(null, null);
});
chrome.contextMenus.onClicked.addListener((info) => {
  const fileId = extractDriveFileId(info.linkUrl ?? info.pageUrl ?? "");
  void openEditor(fileId, null);
});

chrome.runtime.onMessage.addListener((request: BackgroundRequest, _sender, sendResponse) => {
  void handleMessage(request).then(sendResponse);
  return true;
});

async function handleMessage(request: BackgroundRequest): Promise<BackgroundResponse> {
  try {
    if (request.type === "settings:get") return { ok: true, settings: await loadSettings() };
    if (request.type === "settings:update") return { ok: true, settings: await updateSettings(request.settings) };
    if (request.type === "app:open") {
      await openEditor(request.fileId, request.folderId);
      return { ok: true };
    }

    const token = await getAuthToken(request.type === "auth:get-token" ? request.interactive : true);
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
    return toResponseError(error);
  }
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

async function openEditor(fileId: string | null, folderId: string | null): Promise<void> {
  const params = new URLSearchParams();
  if (fileId) params.set("fileId", fileId);
  if (folderId) params.set("folderId", folderId);
  await chrome.tabs.create({ url: chrome.runtime.getURL(`index.html${params.size ? `?${params.toString()}` : ""}`) });
}

function extractDriveFileId(url: string): string | null {
  const match = /\/file\/d\/([^/]+)/.exec(url) ?? /[?&]id=([^&]+)/.exec(url);
  return match?.[1] ?? null;
}

function toResponseError(error: unknown): BackgroundResponse {
  if (error instanceof DriveApiError) {
    return { ok: false, status: error.status, message: error.message, retryAfterMs: error.retryAfterMs };
  }
  return { ok: false, message: error instanceof Error ? error.message : "Unexpected MarkDrive error" };
}
