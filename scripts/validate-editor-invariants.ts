import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, "src/app/markdown-editor.tsx"), "utf8");
const appSource = await readFile(resolve(root, "src/app/main.tsx"), "utf8");
const failures: string[] = [];

expect(source.includes("Vim.defineEx(\"write\", \"w\""), "Vim :w command must be registered.");
expect(source.includes("activeVimSave?.()"), "Vim :w must call the active Drive save callback safely.");
expect(source.includes("let activeVimSave: (() => void) | null = null"), "Vim save callback must start empty instead of retaining stale handlers.");
expect(source.includes("const runVimSave = () => propsRef.current.onVimSave();"), "Vim save callback must read the current editor props.");
expect(source.includes("if (activeVimSave === runVimSave) activeVimSave = null;"), "Unmounted editors must clear their Vim save callback.");
expect(source.includes("activateVimSave();"), "Focused editors must become the active Vim save target.");

for (const extension of [
  "lineNumbers()",
  "foldGutter()",
  "history()",
  "drawSelection()",
  "highlightActiveLine()",
  "bracketMatching()",
  "indentOnInput()",
  "syntaxHighlighting(classHighlighter)",
  "languageCompartment.of(languageExtension(getProps().documentMode))",
  "indentWithTab"
]) {
  expect(source.includes(extension), `Editor extension missing: ${extension}.`);
}

expect(source.includes("import { json } from \"@codemirror/lang-json\""), "Editor must import JSON language support.");
expect(source.includes("documentMode: MarkDriveFileKind"), "Editor must accept a document mode prop.");
expect(source.includes("const languageCompartment = new Compartment()"), "Editor language must be controlled by a compartment.");
expect(source.includes("languageCompartment.reconfigure(languageExtension(props.documentMode))"), "Document mode changes must reconfigure the editor language.");
expect(source.includes("if (getProps().documentMode !== \"markdown\") return false"), "Markdown-only shortcuts must be guarded by document mode.");
expect(source.includes("editorAriaLabel(props.documentMode)"), "Editor must expose a mode-aware aria label.");

expect(source.includes("wrapCompartment.of(getProps().softWrap ? EditorView.lineWrapping : [])"), "Soft wrap must be controlled by a settings compartment.");
expect(source.includes("vimCompartment.of(getProps().vimMode ? vim() : [])"), "Vim mode must be controlled by a settings compartment.");
expect(source.includes("wrapCompartment.reconfigure(props.softWrap ? EditorView.lineWrapping : [])"), "Soft wrap setting changes must reconfigure the editor.");
expect(source.includes("vimCompartment.reconfigure(props.vimMode ? vim() : [])"), "Vim setting changes must reconfigure the editor.");
expect(source.includes("syncingFromPropsRef"), "Editor must suppress onChange while syncing parent markdown into CodeMirror.");
expect(source.includes("update.docChanged && !isSyncingFromProps()"), "Programmatic document sync must not mark Drive conflict resolutions dirty.");

for (const shortcut of ["Mod-s", "Mod-b", "Mod-i", "Mod-k", "Mod-\\\\", "Mod-Shift-f", "F11"]) {
  expect(source.includes(`key: "${shortcut}"`), `Editor shortcut missing: ${shortcut}.`);
}

expect(source.includes("getProps().onSave()"), "Ctrl+S must invoke save.");
expect(source.includes("getProps().onToggleView()"), "Ctrl+Backslash must toggle view.");
expect(source.includes("getProps().onOpenFind()"), "Ctrl+Shift+F must open find and replace.");
expect(source.includes("onFullscreenError(failure: unknown): void"), "Editor fullscreen failures must have an app feedback callback.");
expect(source.includes("toggleFullscreen(getProps)"), "Editor F11 must route fullscreen through guarded handling.");
expect(source.includes("document.documentElement.requestFullscreen()"), "F11 must request fullscreen.");
expect(source.includes("document.exitFullscreen()"), "F11 must exit fullscreen.");
expect(source.includes("getProps().onFullscreenError(failure)"), "Editor F11 fullscreen failures must surface user feedback.");
expect(appSource.includes("window.addEventListener(\"keydown\", handleShortcut)"), "App shell must register global shortcuts.");
expect(appSource.includes("closest(\".cm-editor\")"), "Global shortcuts must not duplicate CodeMirror shortcuts while the editor is focused.");
expect(appSource.includes("void saveCurrent(\"manual\")"), "Global Ctrl+S must invoke save.");
expect(appSource.includes("setViewMode((current) => current === \"split\" ? \"preview\" : current === \"preview\" ? \"editor\" : \"split\")"), "Global Ctrl+Backslash must toggle views even outside the editor.");
expect(appSource.includes("openFindReplace()"), "Global Ctrl+Shift+F must open find and replace outside the editor.");
expect(appSource.includes("const toggleFullscreen = useCallback"), "Global F11 must route fullscreen through a guarded callback.");
expect(appSource.includes("title: \"Fullscreen failed\""), "Fullscreen failures must surface user feedback.");
expect(appSource.includes("toggleFullscreen();"), "Global F11 must invoke guarded fullscreen handling.");
expect(appSource.includes("openFindReplace, previewEnabled, saveCurrent, toggleFullscreen"), "Global shortcut effect must depend on preview availability.");
expect(appSource.includes("const openOptionsPage = useCallback"), "Options opening must route through a guarded callback.");
expect(appSource.includes("title: \"Options failed to open\""), "Options open failures must surface user feedback.");
expect(appSource.includes("title=\"Options\"") && appSource.includes("onClick={openOptionsPage}"), "Toolbar options action must use guarded runtime handling.");
expect(appSource.includes("openOptionsPage(); }}><Settings size={14} /> Options"), "Overflow options action must use guarded runtime handling.");
expect(appSource.includes("onFullscreenError={(failure) => pushToast({ tone: \"danger\", title: \"Fullscreen failed\""), "Editor fullscreen failures must show a toast.");
expect(appSource.includes("if (dirtyRef.current) void saveCurrent(\"autosave\", documentRef.current)"), "Autosave timers must re-check dirty state and save the current document.");
expect(appSource.includes("setSaveState(\"saved\")"), "Accepting the Drive conflict version must leave the document in a saved state.");
expect(appSource.includes("clearRetryTimer"), "Drive issue close/retry must clear pending retry timers.");

expect(source.includes("event.clipboardData?.files"), "Paste handler must inspect image files.");
expect(source.includes("getProps().onImageFiles(files)"), "Paste/drop image files must go through the Drive image upload callback.");
expect(source.includes("event.clipboardData?.getData(\"text/html\")"), "Paste handler must inspect HTML clipboard content.");
expect(source.includes("getProps().onSmartHtmlPaste(html)"), "HTML paste must go through Turndown conversion.");
expect(source.includes("normalizePastedHttpUrl(text)"), "URL paste on selection must normalize clipboard URLs before creating markdown links.");
expect(source.includes("function normalizePastedHttpUrl(text: string): string | null"), "URL paste normalization must be centralized.");
expect(source.includes("const value = text.trim();"), "URL paste normalization must trim clipboard whitespace.");
expect(source.includes("new URL(value)") && source.includes("url.protocol === \"http:\" || url.protocol === \"https:\""), "URL paste normalization must validate HTTP(S) URLs.");
expect(source.includes("event.dataTransfer?.files"), "Drop handler must inspect dropped image files.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Editor invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
