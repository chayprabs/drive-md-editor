import type { OpenDocument } from "./types";

const storageKey = "markdrive.offlineQueue";

export interface QueuedSave {
  id: string;
  document: OpenDocument;
  queuedAt: string;
  attempts: number;
}

export async function queueOfflineSave(document: OpenDocument): Promise<QueuedSave[]> {
  const queue = await loadOfflineQueue();
  const id = document.fileId ?? `new-${document.localVersion}`;
  const existing = queue.find((item) => item.id === id);
  const item: QueuedSave = {
    id,
    document,
    queuedAt: existing?.queuedAt ?? new Date().toISOString(),
    attempts: existing?.attempts ?? 0
  };
  const next = [item, ...queue.filter((entry) => entry.id !== id)];
  await chrome.storage.local.set({ [storageKey]: next });
  return next;
}

export async function loadOfflineQueue(): Promise<QueuedSave[]> {
  const stored = await chrome.storage.local.get(storageKey);
  const value = stored[storageKey];
  return Array.isArray(value) ? value.filter(isQueuedSave) : [];
}

export async function markQueuedSaveAttempt(id: string): Promise<void> {
  const queue = await loadOfflineQueue();
  await chrome.storage.local.set({
    [storageKey]: queue.map((item) => item.id === id ? { ...item, attempts: item.attempts + 1 } : item)
  });
}

export async function removeQueuedSave(id: string): Promise<void> {
  const queue = await loadOfflineQueue();
  await chrome.storage.local.set({ [storageKey]: queue.filter((item) => item.id !== id) });
}

function isQueuedSave(value: unknown): value is QueuedSave {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QueuedSave>;
  return (
    typeof item.id === "string" &&
    typeof item.queuedAt === "string" &&
    typeof item.attempts === "number" &&
    isOpenDocument(item.document)
  );
}

function isOpenDocument(value: unknown): value is OpenDocument {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<OpenDocument>;
  return (
    (typeof item.fileId === "string" || item.fileId === null) &&
    typeof item.name === "string" &&
    typeof item.markdown === "string" &&
    (typeof item.modifiedTime === "string" || item.modifiedTime === null) &&
    (typeof item.folderId === "string" || item.folderId === null) &&
    typeof item.localVersion === "number"
  );
}
