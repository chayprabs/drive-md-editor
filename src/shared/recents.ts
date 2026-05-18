import type { DriveFile, OpenDocument, RecentFile } from "./types";

const storageKey = "markdrive.recents";
const maxRecents = 8;

export async function loadRecents(): Promise<RecentFile[]> {
  const stored = await chrome.storage.local.get(storageKey);
  const value = stored[storageKey];
  if (!Array.isArray(value)) return [];

  const recents = value.map(normalizeRecentFile).filter(isRecentFile).slice(0, maxRecents);
  if (recents.length !== value.length) {
    await chrome.storage.local.set({ [storageKey]: recents });
  }
  return recents;
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
  const normalized = normalizeRecentFile(recent);
  if (!normalized) return loadRecents();

  const current = await loadRecents();
  const next = [normalized, ...current.filter((item) => item.id !== normalized.id)].slice(0, maxRecents);
  await chrome.storage.local.set({ [storageKey]: next });
  return next;
}

function isRecentFile(value: unknown): value is RecentFile {
  return value !== null;
}

function normalizeRecentFile(value: unknown): RecentFile | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<RecentFile>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const modifiedTime = typeof item.modifiedTime === "string" ? item.modifiedTime.trim() : "";
  const openedAt = typeof item.openedAt === "string" ? item.openedAt.trim() : "";
  if (
    id &&
    name &&
    modifiedTime &&
    Number.isFinite(Date.parse(modifiedTime)) &&
    openedAt &&
    Number.isFinite(Date.parse(openedAt))
  ) {
    return {
      id,
      name,
      modifiedTime,
      openedAt
    };
  }
  return null;
}
