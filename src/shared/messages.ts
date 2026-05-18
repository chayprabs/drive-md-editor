import type { DriveFile, MarkDriveSettings, OpenDocument } from "./types";

export type BackgroundRequest =
  | { type: "auth:get-token"; interactive: boolean }
  | { type: "drive:get-file"; fileId: string }
  | { type: "drive:save-file"; fileId: string; markdown: string; previousModifiedTime: string | null }
  | { type: "drive:create-file"; name: string; markdown: string; folderId: string | null }
  | { type: "drive:list-markdown"; folderId: string | null; query: string }
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
  | { ok: true; settings: MarkDriveSettings }
  | { ok: true; imageMarkdown: string }
  | { ok: true }
  | { ok: false; status?: number; message: string; retryAfterMs?: number };

export function sendMessage(request: BackgroundRequest): Promise<BackgroundResponse> {
  return chrome.runtime.sendMessage(request);
}
