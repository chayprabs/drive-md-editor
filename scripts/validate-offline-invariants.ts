import { resolve } from "node:path";
import { includesAll, readSource } from "./invariant-helpers";

const root = resolve(import.meta.dirname, "..");
const queue = await readSource(resolve(root, "src/shared/offline-queue.ts"));
const background = await readSource(resolve(root, "src/background/index.ts"));
const app = await readSource(resolve(root, "src/app/main.tsx"));
const failures: string[] = [];

expect(queue.includes("export const offlineRetryAlarmName = \"markdrive.offline-retry\""), "Offline queue must expose the retry alarm name.");
expect(queue.includes("export const maxOfflineRetryAttempts = 5"), "Offline queue must cap background retry attempts.");
expect(queue.includes("const maxQueuedSaves = 25"), "Offline queue must cap locally persisted saves.");
expect(queue.includes("await scheduleOfflineRetry()"), "Queueing a save must schedule a background retry.");
expect(queue.includes("await clearOfflineRetryAlarm()"), "Clearing the queue must cancel pending retry alarms.");
expect(includesAll(queue, ["removeQueuedSave", "if (next.length === 0) await clearOfflineRetryAlarm()"]), "Removing the last queued save must clear retry alarms.");

expect(includesAll(queue, ["normalizeOpenDocument(document)", "if (!normalizedDocument) throw new Error"]), "Offline queue writes must reject invalid documents.");
expect(queue.includes("newDocumentQueueId(normalizedDocument)"), "Unsynced new document saves must coalesce by folder and name.");
expect(queue.includes("`new-${document.folderId ?? \"root\"}-${document.name}`"), "Unsynced new document queue ids must be stable across edits.");
expect(includesAll(queue, ["markQueuedSaveAttempt", "attempts: item.attempts + 1"]), "Offline queue must increment retry attempt counts.");

expect(background.includes("chrome.alarms.onAlarm.addListener"), "Background must listen for offline retry alarms.");
expect(includesAll(background, ["offlineRetryAlarmName", "flushOfflineQueue"]), "Background must flush the offline queue when the retry alarm fires.");
expect(background.includes("await flushOfflineQueue()"), "Background startup must attempt to flush any persisted offline queue.");
expect(includesAll(background, ["item.attempts >= maxOfflineRetryAttempts", "continue"]), "Background flush must skip saves that exceeded the retry limit.");

expect(app.includes("maxOfflineRetryAttempts"), "App offline retry must honor the shared retry limit.");
expect(includesAll(app, ["window.addEventListener(\"online\", retry)", "navigator.onLine"]), "App must retry the offline queue when connectivity returns.");
expect(includesAll(app, ["queueOfflineSave", "safelyQueueOfflineSave"]), "App must route offline saves through guarded local persistence.");
expect(app.includes("title: \"Queued save retry failed\""), "Offline queue retry failures must show user feedback.");
expect(app.includes("title: \"Queued save synced but not cleared\""), "Offline queue removal failures must show user feedback.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Offline invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
