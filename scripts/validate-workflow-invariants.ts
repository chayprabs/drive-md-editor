import { resolve } from "node:path";
import { includesAll, readSource } from "./invariant-helpers";

const root = resolve(import.meta.dirname, "..");
const app = await readSource(resolve(root, "src/app/main.tsx"));
const emptyState = await readSource(resolve(root, "src/app/empty-state.tsx"));
const onboarding = await readSource(resolve(root, "src/app/onboarding.tsx"));
const recents = await readSource(resolve(root, "src/shared/recents.ts"));
const sidebar = await readSource(resolve(root, "src/app/sidebar.tsx"));
const failures: string[] = [];

expect(app.includes("const [showEmptyState"), "App must track the empty state.");
expect(app.includes("function readQueryParam(name: string): string | null"), "App URL parameter handling must be centralized.");
expect(app.includes("const value = new URLSearchParams(location.search).get(name)?.trim();"), "App URL parameters must be trimmed before use.");
expect(app.includes("import { cleanDriveId } from \"../shared/drive-url\";"), "App URL parameter handling must use the shared Drive id cleaner.");
expect(app.includes("return cleanDriveId(value);"), "Empty or malformed app URL parameters must be ignored.");
expect(app.includes("readQueryParam(\"fileId\") === null"), "App must show the empty state when no Drive file is opened.");
expect(app.includes("const [showOnboarding"), "App must track onboarding visibility.");
expect(app.includes("readQueryParam(\"onboarding\") === \"1\""), "App must support install-time onboarding through the URL.");
expect(app.includes("!response.settings.onboardingComplete"), "App must show onboarding until completed.");
expect(app.includes("onboardingComplete: true"), "Finishing onboarding must persist completion.");
expect(app.includes("window.addEventListener(\"beforeunload\", guard)"), "App must guard unsaved changes.");
expect(app.includes("if (!dirtyRef.current) return;"), "Unsaved changes guard must only trigger for dirty documents.");

for (const mode of ["split", "editor", "preview"]) {
  expect(app.includes(`viewMode === "${mode}"`), `App must support ${mode} view mode.`);
}
expect(app.includes("{viewMode !== \"preview\" &&"), "Editor pane must hide in preview-only mode.");
expect(app.includes("previewEnabled && viewMode !== \"editor\""), "Preview pane must hide when preview is disabled or in editor-only mode.");
expect(app.includes("const previewEnabled = useMemo"), "App must derive preview availability from file kind.");
expect(app.includes("if (!previewEnabled) setViewMode(\"editor\")"), "Non-markdown files must force editor-only mode.");
expect(app.includes("if (!previewEnabled && activeSidebar === \"frontmatter\") setActiveSidebar(\"outline\")"), "Frontmatter sidebar must hide for non-markdown files.");
expect(app.includes("documentMode={fileKind}"), "Editor must receive the active document mode.");
expect(app.includes("isSupportedFileName(response.file.name)"), "Opening Drive files must reject unsupported names.");

for (const tab of ["outline", "drive", "frontmatter"]) {
  expect(app.includes(`activeSidebar === "${tab}"`), `Sidebar rail must expose ${tab}.`);
  expect(sidebar.includes(`props.active === "${tab}"`), `Sidebar must render ${tab} panel.`);
}

expect(app.includes("<span>{stats.words} words</span>"), "Status bar must show word count.");
expect(app.includes("<span>{stats.chars} chars</span>"), "Status bar must show character count.");
expect(app.includes("previewEnabled ? <span>{stats.reading} min read</span> : null"), "Status bar must hide reading time when preview is disabled.");
expect(app.includes("fileKindLabel(fileKind)"), "Status bar must show the active file kind.");
expect(app.includes("jsonStatus"), "Status bar must show JSON syntax status for JSON files.");
expect(app.includes("<span>Ln {cursor.line}, Col {cursor.column}</span>"), "Status bar must show cursor line and column.");
expect(app.includes("className={`save-state ${saveState}`}"), "Status bar must show save state.");

expect(emptyState.includes("Your Markdown, native in Drive."), "Empty state must include the MarkDrive tagline.");
expect(emptyState.includes("New File"), "Empty state must expose New File.");
expect(emptyState.includes("Browse Drive"), "Empty state must expose Browse Drive.");
expect(emptyState.includes("Recents"), "Empty state must expose recents.");
expect(emptyState.includes("onOpenRecent(file.id)"), "Empty state recents must reopen Drive files.");
expect(app.includes("const safelySetRecents = useCallback"), "App must isolate recents storage failures.");
expect(app.includes("title: \"Recents unavailable\""), "Recents storage failures must show user feedback.");
expect(app.includes("void safelySetRecents(loadRecents)"), "Initial recents loading must use the guarded path.");
expect(app.includes("await safelySetRecents(() => rememberDriveFile(response.file))"), "Opening Drive files must remember recents through the guarded path.");
expect(app.includes("await safelySetRecents(() => rememberDocument(response.document))"), "Saved Drive documents must remember recents through the guarded path.");

expect(recents.includes("const maxRecents = 8"), "Recents must be capped to eight files.");
expect(recents.includes("value.map(normalizeRecentFile).filter(isRecentFile).slice(0, maxRecents)"), "Stored recents must be normalized, filtered, and capped when loaded.");
expect(recents.includes("chrome.storage.local.set({ [storageKey]: recents })"), "Loading recents must clean stale stored entries.");
expect(recents.includes("const normalized = normalizeRecentFile(recent);"), "New recents must be normalized before persistence.");
expect(recents.includes("const id = typeof item.id === \"string\" ? item.id.trim() : \"\";"), "Stored recents must trim and reject empty Drive file ids.");
expect(recents.includes("const name = typeof item.name === \"string\" ? item.name.trim() : \"\";"), "Stored recents must trim and reject empty file names.");
expect(recents.includes("Number.isFinite(Date.parse(modifiedTime))"), "Stored recents must reject invalid Drive modified timestamps.");
expect(recents.includes("Number.isFinite(Date.parse(openedAt))"), "Stored recents must reject invalid opened timestamps.");

expect(onboarding.includes("const steps = ["), "Onboarding must define steps.");
expect((onboarding.match(/title:/g) ?? []).length === 4, "Onboarding must have four steps.");
expect(onboarding.includes("Open Markdown from Drive"), "Onboarding must cover opening Drive Markdown files.");
expect(onboarding.includes("Write and Preview Together"), "Onboarding must cover editor and preview modes.");
expect(onboarding.includes("Keep Drive in Sync"), "Onboarding must cover Drive sync.");
expect(onboarding.includes("Work from the Keyboard"), "Onboarding must cover keyboard workflows.");
expect(onboarding.includes("Start Editing"), "Onboarding must finish with a start editing action.");

expect(sidebar.includes("<h2>Outline</h2>"), "Outline panel must be labelled.");
expect(sidebar.includes("onClick={() => onJump(item.line)}"), "Outline entries must jump to headings.");
expect(sidebar.includes("<h2>Drive</h2>"), "Drive browser panel must be labelled.");
expect(sidebar.includes("aria-label=\"Search supported files\""), "Drive browser must expose supported file search.");
expect(sidebar.includes("const unexpectedDriveResponse = \"Drive returned an unexpected response.\""), "Drive browser must have a stable malformed-response error.");
expect(sidebar.includes("const loadRequestRef = useRef(0)"), "Drive browser loads must track request freshness.");
expect(sidebar.includes("requestId !== loadRequestRef.current"), "Drive browser must ignore stale folder/search responses.");
expect(sidebar.includes("const [actionBusy, setActionBusy] = useState(false)"), "Drive browser must expose action busy state.");
expect(sidebar.includes("const actionBusyRef = useRef(false)"), "Drive browser must synchronously guard repeated actions.");
expect(sidebar.includes("function beginDriveAction(): boolean"), "Drive browser actions must use a centralized duplicate-action guard.");
expect(sidebar.includes("if (actionBusyRef.current) return false;"), "Drive browser must reject duplicate in-flight actions.");
expect(sidebar.includes("function finishDriveAction(): void"), "Drive browser actions must reliably clear the duplicate-action guard.");
expect(sidebar.includes("Drive browser failed to load."), "Drive browser must surface runtime load failures.");
expect(sidebar.includes("fileResponse.ok ? unexpectedDriveResponse : fileResponse.message"), "Drive browser file loads must surface malformed responses.");
expect(sidebar.includes("folderResponse.ok ? unexpectedDriveResponse : folderResponse.message"), "Drive browser folder loads must surface malformed responses.");
expect(sidebar.includes("pathResponse.ok ? unexpectedDriveResponse : pathResponse.message"), "Drive browser path loads must surface malformed responses.");
expect(sidebar.includes("if (requestId === loadRequestRef.current) setBusy(false)"), "Drive browser must clear busy state only for the latest load.");
expect(sidebar.includes("type: \"drive:create-file\""), "Drive browser must create supported files.");
expect(sidebar.includes("async function createFile()") && sidebar.includes("setError(describeUnknownError(failure))"), "Drive browser create failures must surface runtime errors.");
expect(sidebar.includes("setFiles((current) => [") && sidebar.includes("created.fileId"), "Drive browser create must add the new file to the folder list.");
expect(sidebar.includes("if (!beginDriveAction()) return;"), "Drive browser create, rename, trash, and expand actions must avoid double submission.");
expect(sidebar.includes("setError(response.ok ? unexpectedDriveResponse : response.message)"), "Drive browser create/folder responses must reject malformed successes.");
expect(app.includes("folderId: browserFolderId"), "New local documents must target the current Drive browser folder.");
expect(app.includes("browserFolderId"), "New file action must update when the current Drive browser folder changes.");
expect(app.includes("confirmLeaveDocument"), "New file action must guard unsaved changes.");
expect(sidebar.includes("type: \"drive:rename-file\""), "Drive browser must rename files.");
expect(sidebar.includes("async function renameFile") && sidebar.includes("setError(describeUnknownError(failure))"), "Drive browser rename failures must surface runtime errors.");
expect(sidebar.includes("setError(null);"), "Successful Drive browser actions must clear stale errors.");
expect(sidebar.includes("normalizeSupportedFileName(newName, newFileKind)"), "Drive browser must normalize names when creating files.");
expect(sidebar.includes("normalizeSupportedFileName(name, kind)"), "Drive browser must normalize names when renaming files.");
expect(sidebar.includes("const [newFileKind, setNewFileKind]"), "Drive browser must let users choose a new file kind.");
expect(sidebar.includes("No supported files in this folder."), "Drive browser empty state must mention supported files.");
expect(sidebar.includes("mimeTypeForFileName(created.name)"), "Drive browser must store MIME types from file names.");
expect(sidebar.includes("type: \"drive:trash-file\""), "Drive browser must trash files.");
expect(sidebar.includes("async function trashFile") && sidebar.includes("void trashFile(file.id, file.name)"), "Drive browser trash failures must use a handled action.");
expect(sidebar.includes("Move \"") && sidebar.includes("to trash?"), "Drive browser trash must confirm before deleting.");
expect(sidebar.includes("onDriveFailure"), "Drive browser must route auth and rate-limit failures through the shared modal.");
expect(sidebar.includes("reportDriveBrowserFailure"), "Drive browser must escalate handled Drive failures to the app shell.");
expect(sidebar.includes("activeFileId"), "Drive browser must highlight the open file.");
expect(sidebar.includes("async function toggleFolder") && includesAll(sidebar, ["finally {", "setExpandingFolderId(null);", "finishDriveAction();"]), "Drive browser folder expansion failures must clear busy state.");
expect(sidebar.includes("disabled={actionBusy}"), "Drive browser mutation controls must be disabled while actions are in flight.");
expect(sidebar.includes("aria-busy={busy || actionBusy}"), "Drive browser file list must expose load and action busy state.");
expect(sidebar.includes("function describeUnknownError(failure: unknown): string"), "Drive browser runtime failures must have a stable fallback message.");
expect(sidebar.includes("<h2>Frontmatter</h2>"), "Frontmatter panel must be labelled.");
for (const field of ["Title", "Date", "Tags", "Author", "Draft"]) {
  expect(sidebar.includes(field), `Frontmatter panel must expose ${field}.`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Workflow invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
