import type { DriveFile, OpenDocument, RecentFile } from "./types";

const storageKey = "markdrive.recents";
const maxRecents = 8;

export async function loadRecents(): Promise<RecentFile[]> {
  const stored = await chrome.storage.local.get(storageKey);
  const value = stored[storageKey];
  return Array.isArray(value) ? value.filter(isRecentFile).slice(0, maxRecents) : [];
}

export async function rememberDriveFile(file: DriveFile): Promise<RecentFile[]> {
  return rememberRecent({
    id: file.id,
    name: file.name,
    modifiedTime: file.modifiedTime,
    openedAt: new Date().toISOString()
  });
}

export async function rememberDocument(document: OpenDocument): Promise<RecentFile[]> {
  if (!document.fileId || !document.modifiedTime) return loadRecents();
  return rememberRecent({
    id: document.fileId,
    name: document.name,
    modifiedTime: document.modifiedTime,
    openedAt: new Date().toISOString()
  });
}

async function rememberRecent(recent: RecentFile): Promise<RecentFile[]> {
  const current = await loadRecents();
  const next = [recent, ...current.filter((item) => item.id !== recent.id)].slice(0, maxRecents);
  await chrome.storage.local.set({ [storageKey]: next });
  return next;
}

function isRecentFile(value: unknown): value is RecentFile {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RecentFile>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.modifiedTime === "string" &&
    typeof item.openedAt === "string"
  );
}
