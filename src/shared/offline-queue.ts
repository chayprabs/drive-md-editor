import type { OpenDocument } from "./types";

const storageKey = "markdrive.offlineQueue";
const maxQueuedSaves = 25;
export const offlineRetryAlarmName = "markdrive.offline-retry";
export const maxOfflineRetryAttempts = 5;

export interface QueuedSave {
  id: string;
  document: OpenDocument;
  queuedAt: string;
  attempts: number;
}

export async function queueOfflineSave(document: OpenDocument): Promise<QueuedSave[]> {
  const queue = await loadOfflineQueue();
  const normalizedDocument = normalizeOpenDocument(document);
  if (!normalizedDocument) throw new Error("Invalid offline save document.");
  const id = normalizedDocument.fileId ?? newDocumentQueueId(normalizedDocument);
  const existing = queue.find((item) => item.id === id);
  const item: QueuedSave = {
    id,
    document: normalizedDocument,
    queuedAt: existing?.queuedAt ?? new Date().toISOString(),
    attempts: existing?.attempts ?? 0
  };
  const next = [item, ...queue.filter((entry) => entry.id !== id)].slice(0, maxQueuedSaves);
  await chrome.storage.local.set({ [storageKey]: next });
  await scheduleOfflineRetry();
  return next;
}

export async function scheduleOfflineRetry(delayMinutes = 1): Promise<void> {
  await chrome.alarms.create(offlineRetryAlarmName, { delayInMinutes: delayMinutes });
}

export async function clearOfflineRetryAlarm(): Promise<void> {
  await chrome.alarms.clear(offlineRetryAlarmName);
}

function newDocumentQueueId(document: OpenDocument): string {
  return `new-${document.folderId ?? "root"}-${document.name}`;
}

export async function loadOfflineQueue(): Promise<QueuedSave[]> {
  const stored = await chrome.storage.local.get(storageKey);
  const value = stored[storageKey];
  if (!Array.isArray(value)) return [];

  const queue = value.map(normalizeQueuedSave).filter(isQueuedSave).slice(0, maxQueuedSaves);
  if (queue.length !== value.length) {
    await chrome.storage.local.set({ [storageKey]: queue });
  }
  return queue;
}

export async function markQueuedSaveAttempt(id: string): Promise<void> {
  const queue = await loadOfflineQueue();
  await chrome.storage.local.set({
    [storageKey]: queue.map((item) => item.id === id ? { ...item, attempts: item.attempts + 1 } : item)
  });
}

export async function removeQueuedSave(id: string): Promise<void> {
  const queue = await loadOfflineQueue();
  const next = queue.filter((item) => item.id !== id);
  await chrome.storage.local.set({ [storageKey]: next });
  if (next.length === 0) await clearOfflineRetryAlarm();
}

function isQueuedSave(value: unknown): value is QueuedSave {
  return value !== null;
}

function normalizeQueuedSave(value: unknown): QueuedSave | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<QueuedSave>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const document = normalizeOpenDocument(item.document);
  if (
    id &&
    typeof item.id === "string" &&
    typeof item.queuedAt === "string" &&
    Number.isFinite(Date.parse(item.queuedAt)) &&
    typeof item.attempts === "number" &&
    Number.isInteger(item.attempts) &&
    item.attempts >= 0 &&
    document
  ) {
    return {
      id,
      document,
      queuedAt: item.queuedAt.trim(),
      attempts: item.attempts
    };
  }
  return null;
}

function normalizeOpenDocument(value: unknown): OpenDocument | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<OpenDocument>;
  const fileId = optionalDriveId(item.fileId);
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const modifiedTime = optionalDateString(item.modifiedTime);
  const folderId = optionalDriveId(item.folderId);
  if (
    fileId !== undefined &&
    name &&
    typeof item.markdown === "string" &&
    modifiedTime !== undefined &&
    folderId !== undefined &&
    typeof item.localVersion === "number" &&
    Number.isInteger(item.localVersion) &&
    item.localVersion >= 0
  ) {
    return {
      fileId,
      name,
      markdown: item.markdown,
      modifiedTime,
      folderId,
      localVersion: item.localVersion
    };
  }
  return null;
}

function optionalDriveId(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function optionalDateString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed && Number.isFinite(Date.parse(trimmed)) ? trimmed : undefined;
}
