import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const app = await readFile(resolve(root, "src/app/main.tsx"), "utf8");
const background = await readFile(resolve(root, "src/background/index.ts"), "utf8");
const driveApi = await readFile(resolve(root, "src/background/drive-api.ts"), "utf8");
const modal = await readFile(resolve(root, "src/app/drive-issue-modal.tsx"), "utf8");
const queue = await readFile(resolve(root, "src/shared/offline-queue.ts"), "utf8");
const preview = await readFile(resolve(root, "src/app/preview-pane.tsx"), "utf8");
const messages = await readFile(resolve(root, "src/shared/messages.ts"), "utf8");
const failures: string[] = [];

for (const status of ["401", "403", "404", "429"]) {
  expect(app.includes(`status === ${status}`), `App must branch on Drive ${status} responses.`);
}

expect(app.includes("setDriveIssue({ kind: \"auth\", message })"), "401 responses must show the re-authentication modal.");
expect(app.includes("setDriveIssue({ kind: \"permission\", message })"), "403 responses must show the permission modal.");
expect(app.includes("setDriveIssue({ kind: \"deleted\", message })"), "404 responses must show the deleted-file modal.");
expect(app.includes("setDriveIssue({ kind: \"rate-limit\", message, retryAfterMs: delay })"), "429 responses must show retry timing.");
expect(app.includes("retryAfterMs ?? 4000"), "429 responses must use a bounded fallback backoff.");
expect(app.includes("window.setTimeout(() => void saveCurrent(\"manual\"), delay)"), "429 responses must schedule a retry.");
expect(app.includes("clearRetryTimer"), "Drive issue actions must clear pending retry timers.");
expect(app.includes("queueOfflineSave(target)"), "Offline saves must be queued locally.");
expect(app.includes("response.status === 0 || !navigator.onLine"), "Network save failures must be queued even if the browser still reports online.");
expect(app.includes("Network failed during save. Changes are queued locally and will retry when online."), "Network save failures must explain that changes were queued.");
expect(app.includes("window.addEventListener(\"online\", retry)"), "Queued offline saves must retry when the browser returns online.");
expect(app.includes("pushToast({ tone: \"warning\", title: \"Offline\""), "Offline saves must show user feedback.");
expect(app.includes("const safelyQueueOfflineSave = useCallback"), "Offline queue storage failures must be isolated.");
expect(app.includes("title: \"Offline queue failed\""), "Offline queue storage failures must show user feedback.");
expect(app.includes("if (await safelyQueueOfflineSave(target, \"Changes could not be stored locally.\"))"), "Offline manual saves must only claim queueing after local persistence succeeds.");
expect(app.includes("Runtime save failure could not be stored locally."), "Runtime save queue failures must explain local persistence failure.");
expect(app.includes("Network save failure could not be stored locally."), "Network save queue failures must explain local persistence failure.");
expect(app.includes("pushToast({ tone: \"danger\", title: \"Save failed\", detail })"), "Save failures must show user feedback.");
expect(app.includes("pushToast({ tone: \"danger\", title: \"Could not open file\""), "Open failures must show user feedback.");
expect(app.includes("title: \"Save queued locally\""), "Runtime save failures must be queued locally with user feedback.");
expect(app.includes("MarkDrive could not reach the extension background."), "Runtime save failure feedback must explain the background messaging failure.");
expect(app.includes("title: \"Authentication failed\", detail: describeUnknownError(failure)"), "Interactive re-authentication runtime failures must show user feedback.");
expect(app.includes("title: \"Queued save retry failed\""), "Queued save runtime retry failures must show user feedback.");
expect(app.includes("title: \"Offline queue unavailable\""), "Offline queue load failures must show user feedback.");
expect(app.includes("title: \"Queued save synced but not cleared\""), "Offline queue removal failures must show user feedback.");
expect(app.includes("handleDriveFailure(response.status, detail, response.retryAfterMs"), "Open failures must use the same Drive issue modal path as save failures.");
expect(app.includes("const handleDriveFailure = useCallback"), "Drive issue modal routing must be reusable across open and save failures.");
expect(app.includes("driveIssueRetryRef"), "Drive issue retries must preserve the action that failed.");
expect(modal.includes("remainingMs"), "Rate-limit modal must show a live retry countdown.");
expect(modal.includes("disabled={issue.kind === \"rate-limit\" && remainingMs > 0}"), "Rate-limit retry must stay disabled until the countdown completes.");
expect(app.includes("pushToast({ tone: \"danger\", title: \"Image upload failed\""), "Image upload failures must show user feedback.");
expect(app.includes("title: \"Preview rendering failed\""), "Preview hydration failures must show user feedback.");
expect(preview.includes("onHydrationError(failure: unknown): void"), "Preview must expose a hydration failure callback.");
expect(preview.includes("const hydrationVersionRef = useRef(0)"), "Preview hydration must track render freshness.");
expect(preview.includes("const isCurrentHydration = () => hydrationVersionRef.current === version;"), "Preview hydration must expose a freshness guard.");
expect(preview.includes("hydrateMathAndDiagrams(host, theme, onHydrationError, isCurrentHydration)"), "Preview hydration must pass the freshness guard through lazy hydration.");
expect(preview.includes("if (isCurrentHydration()) onHydrationError(failure);"), "Stale preview hydration failures must not show user feedback.");
expect(preview.includes("if (hydrationVersionRef.current === version) hydrationVersionRef.current += 1;"), "Preview hydration cleanup must invalidate pending work.");
expect(preview.includes("katex.default.render(node.textContent ?? \"\", node.parentElement ?? node, { throwOnError: false });"), "KaTeX rendering must keep non-throwing parse behavior enabled.");
expect(preview.includes("wrapper.className = \"katex-error\"") && preview.includes("wrapper.setAttribute(\"role\", \"alert\")") && preview.includes("wrapper.textContent = \"Math failed to render.\""), "KaTeX render failures must leave an accessible inline error.");
expect(preview.includes("onHydrationError(failure);\n        const wrapper = document.createElement(\"div\");"), "Mermaid diagram failures must be reported without aborting all preview hydration.");
expect(preview.includes("wrapper.className = \"mermaid-error\"") && preview.includes("wrapper.setAttribute(\"role\", \"alert\")"), "Mermaid diagram failures must leave an accessible inline error.");
expect(preview.includes("isCurrentHydration: () => boolean"), "Preview hydration helpers must receive a freshness guard.");
expect(preview.includes("async function hydrateCode("), "Code highlighting must receive the preview hydration failure callback.");
expect(preview.includes("if (!isCurrentHydration()) return;"), "Preview hydration helpers must stop stale lazy work.");
expect(preview.includes("hljs.default.highlightElement(node);") && preview.includes("node.classList.add(\"highlight-error\")"), "Code highlighting failures must be isolated per code block.");
expect(preview.includes("node.setAttribute(\"role\", \"alert\")"), "Code highlighting failures must leave an accessible inline error state.");

expect(messages.includes("const response = await chrome.runtime.sendMessage(request) as unknown;"), "Runtime message responses must be treated as untrusted data.");
expect(messages.includes("if (isBackgroundResponse(request, response)) return response;"), "Runtime message responses must be validated before callers use them.");
expect(messages.includes("throw new Error(\"MarkDrive background returned an invalid response.\");"), "Malformed runtime responses must become actionable user-facing errors.");
expect(messages.includes("function isBackgroundResponse(request: BackgroundRequest, response: unknown): response is BackgroundResponse"), "Runtime response validation must be centralized.");
expect(messages.includes("if (request.type === \"drive:upload-image\") return typeof record.imageMarkdown === \"string\";"), "Runtime response validation must reject malformed image upload successes.");
expect(messages.includes("if (request.type === \"settings:get\" || request.type === \"settings:update\") return isSettings(record.settings);"), "Runtime response validation must reject malformed settings successes.");
expect(messages.includes("if (request.type === \"drive:get-file\") return isDriveFile(record.file) && typeof record.markdown === \"string\";"), "Runtime response validation must reject malformed Drive file successes.");
expect(messages.includes("function nonEmptyString(value: unknown): value is string"), "Runtime response validation must reject empty Drive ids and names.");
expect(messages.includes("function validDateString(value: unknown): value is string"), "Runtime response validation must centralize Drive timestamp validation.");
expect(messages.includes("Number.isFinite(Date.parse(value))"), "Runtime response validation must reject invalid Drive timestamps.");
expect(messages.includes("typeof record.localVersion === \"number\"") && messages.includes("Number.isInteger(record.localVersion)") && messages.includes("record.localVersion >= 0"), "Runtime response validation must reject invalid open document versions.");
expect(messages.includes("optionalStringArray(record.parents)"), "Runtime response validation must validate optional Drive parent arrays.");

expect(modal.includes("Re-authenticate"), "The auth modal must offer re-authentication.");
expect(modal.includes("Drive denied permission"), "The permission modal must identify permission failures.");
expect(modal.includes("This Drive file is unavailable"), "The deleted-file modal must identify unavailable files.");
expect(modal.includes("Drive is rate limiting saves"), "The rate-limit modal must identify rate limiting.");
expect(modal.includes("Retrying in"), "The rate-limit modal must disclose retry timing.");
expect(modal.includes("issue.kind !== \"deleted\""), "The deleted-file modal must not offer a retry action.");

expect(background.includes("new DriveApiError(401"), "Authentication failures must map to 401.");
expect(background.includes("let token: string | null = null;"), "Background Drive requests must retain the OAuth token for cache invalidation.");
expect(background.includes("error instanceof DriveApiError && error.status === 401") && background.includes("await forgetAuthToken(token)"), "Drive 401 responses must invalidate the cached OAuth token before re-authentication.");
expect(background.includes("async function forgetAuthToken(token: string): Promise<void>"), "Cached OAuth token invalidation must be centralized.");
expect(background.includes("chrome.identity.removeCachedAuthToken({ token })"), "Cached OAuth token invalidation must use the Chrome identity API.");
expect(background.includes("error instanceof TypeError") && background.includes("status: 0"), "Network fetch failures must map to status 0.");
expect(background.includes("toResponseError(error)"), "Background errors must be converted into structured responses.");
expect(background.includes("retryAfterMs: error.retryAfterMs"), "Background responses must preserve retry timing.");
expect(background.includes("chrome.runtime.onMessage.addListener((request: unknown"), "Background messages must be treated as untrusted runtime data.");
expect(background.includes("if (!isBackgroundRequest(request)) return { ok: false, status: 400, message: \"Invalid MarkDrive request.\" };"), "Invalid background requests must fail before OAuth or Drive access.");
expect(background.includes("function isBackgroundRequest(request: unknown): request is BackgroundRequest"), "Background request validation must be centralized.");
expect(background.includes("function nonEmptyString(value: unknown): value is string"), "Background request validation must reject blank Drive ids and names.");
expect(background.includes("function optionalDriveId(value: unknown): value is string | null"), "Background request validation must centralize optional Drive id checks.");
expect(background.includes("function optionalDateString(value: unknown): value is string | null"), "Background request validation must centralize optional timestamp checks.");
expect(background.includes("Number.isFinite(Date.parse(value))"), "Background request validation must reject invalid conflict timestamps.");
expect(background.includes("import { cleanDriveId, extractDriveFileIdFromUrl } from \"../shared/drive-url\";"), "Background editor opens must share Drive id cleanup.");
expect(background.includes("const cleanFileId = cleanDriveId(fileId);") && background.includes("const cleanFolderId = cleanDriveId(folderId);"), "Background editor URLs must normalize Drive ids before opening tabs.");
expect(background.includes("const storedFileId = typeof target?.fileId === \"string\" ? cleanDriveId(target.fileId) : null;"), "Context menu session fallback must normalize stored file ids.");
expect(background.includes("const storedFolderId = typeof target?.folderId === \"string\" ? cleanDriveId(target.folderId) : null;"), "Context menu session fallback must normalize stored folder ids.");
expect(background.includes("throw new Error(\"MarkDrive could not determine which Drive file to open from this context.\")"), "Context menu fallback must fail clearly when no Drive file can be resolved.");
expect(background.includes("record.type === \"drive:save-file\"") && background.includes("optionalDateString(record.previousModifiedTime)"), "Save requests must validate conflict metadata before use.");
expect(background.includes("record.type === \"drive:upload-image\"") && background.includes("nonEmptyString(record.dataUrl)"), "Image upload requests must validate image payloads before use.");
expect(background.includes("if (record.type === \"drive:get-file\") return nonEmptyString(record.fileId);"), "Open-file requests must reject blank Drive file ids.");
expect(background.includes("if (record.type === \"drive:rename-file\") return nonEmptyString(record.fileId) && nonEmptyString(record.name);"), "Rename requests must reject blank Drive ids and names.");
expect(background.includes("void initializeExtension(reason)"), "Install-time background setup must be guarded.");
expect(background.includes("void runBackgroundAction(() => openEditor(null, null))"), "Toolbar and command open actions must be guarded.");
expect(background.includes("void runBackgroundAction(() => openFromContext"), "Context menu open actions must be guarded.");
expect(background.includes("async function flushOfflineQueue"), "Background worker must flush queued offline saves.");
expect(background.includes("error.status === 409"), "Background offline flush must stop on save conflicts instead of retrying blindly.");
expect(background.includes("chrome.action.setBadgeText({ text: \"!\" })"), "Background action failures must show an extension badge.");
expect(background.includes("chrome.action.setTitle({ title: `MarkDrive error: ${message}` })"), "Background action failures must expose the error in the extension title.");
expect(background.includes("function clearBackgroundFailure"), "Successful editor opens must clear background failure feedback.");
expect(driveApi.includes("driveErrorFromResponse(response)"), "Drive API JSON requests must use shared structured error parsing.");
expect(driveApi.includes("driveErrorFromResponse(contentResponse)"), "Drive media downloads must use shared structured error parsing.");
expect(driveApi.includes("response.headers.get(\"retry-after\")"), "Drive API must read retry-after headers.");
expect(driveApi.includes("Number.parseInt(retryAfter, 10)") && driveApi.includes("seconds * 1000"), "Drive API must convert retry-after seconds to milliseconds.");
expect(driveApi.includes("Date.parse(retryAfter)"), "Drive API must support HTTP-date retry-after values.");
expect(driveApi.includes("new DriveApiError(response.status, message, retryAfterMs)"), "Drive API failures must include status and retry timing.");

expect(queue.includes("chrome.storage.local.set"), "Offline queue must persist saves to local extension storage.");
expect(queue.includes("const maxQueuedSaves = 25"), "Offline queue must cap locally persisted saves.");
expect(queue.includes("newDocumentQueueId(normalizedDocument)"), "Offline queue must coalesce repeated saves of normalized unsynced new documents.");
expect(queue.includes("`new-${document.folderId ?? \"root\"}-${document.name}`"), "Unsynced new document queue ids must be stable across edits.");
expect(queue.includes("value.map(normalizeQueuedSave).filter(isQueuedSave).slice(0, maxQueuedSaves)"), "Offline queue must normalize, filter, and cap stored saves when loading.");
expect(queue.includes("chrome.storage.local.set({ [storageKey]: queue })"), "Offline queue loads must clean stale stored entries.");
expect(queue.includes("attempts: existing?.attempts ?? 0"), "Offline queue must retain retry attempt counts.");
expect(queue.includes("markQueuedSaveAttempt"), "Offline queue must record retry attempts.");
expect(queue.includes("removeQueuedSave"), "Offline queue must remove synced saves.");
expect(background.includes("chrome.runtime.onStartup.addListener"), "Background must flush offline saves when Chrome starts.");
expect(background.includes("chrome.alarms.onAlarm.addListener"), "Background must retry offline saves on alarms.");
expect(background.includes("flushOfflineQueue"), "Background must flush queued offline saves.");
expect(background.includes("item.attempts >= maxOfflineRetryAttempts"), "Background offline flush must stop retrying exhausted saves.");
expect(app.includes("maxOfflineRetryAttempts"), "App offline retry must honor the shared retry limit.");
expect(queue.includes("const normalizedDocument = normalizeOpenDocument(document);"), "Offline queue writes must normalize documents before persistence.");
expect(queue.includes("const id = typeof item.id === \"string\" ? item.id.trim() : \"\";"), "Offline queue must trim queued save ids.");
expect(queue.includes("Number.isFinite(Date.parse(item.queuedAt))"), "Offline queue must reject invalid queued timestamps.");
expect(queue.includes("Number.isInteger(item.attempts)") && queue.includes("item.attempts >= 0"), "Offline queue must reject invalid retry attempt counts.");
expect(queue.includes("const name = typeof item.name === \"string\" ? item.name.trim() : \"\";"), "Offline queue must trim and reject unnamed queued documents.");
expect(queue.includes("function optionalDateString(value: unknown): string | null | undefined"), "Offline queue must normalize optional Drive modified timestamps.");
expect(queue.includes("Number.isInteger(item.localVersion)") && queue.includes("item.localVersion >= 0"), "Offline queue must reject invalid local versions.");
expect(queue.includes("function optionalDriveId(value: unknown): string | null | undefined"), "Offline queue must normalize optional Drive ids.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Error handling invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
