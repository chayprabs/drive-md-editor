import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, "src/app/markdown-editor.tsx"), "utf8");
const failures: string[] = [];

expect(source.includes("Vim.defineEx(\"write\", \"w\""), "Vim :w command must be registered.");
expect(source.includes("activeVimSave()"), "Vim :w must call the Drive save callback.");

for (const extension of [
  "lineNumbers()",
  "foldGutter()",
  "history()",
  "drawSelection()",
  "highlightActiveLine()",
  "bracketMatching()",
  "indentOnInput()",
  "syntaxHighlighting(classHighlighter)",
  "markdown({ base: markdownLanguage })",
  "indentWithTab"
]) {
  expect(source.includes(extension), `Editor extension missing: ${extension}.`);
}

expect(source.includes("wrapCompartment.of(getProps().softWrap ? EditorView.lineWrapping : [])"), "Soft wrap must be controlled by a settings compartment.");
expect(source.includes("vimCompartment.of(getProps().vimMode ? vim() : [])"), "Vim mode must be controlled by a settings compartment.");
expect(source.includes("wrapCompartment.reconfigure(props.softWrap ? EditorView.lineWrapping : [])"), "Soft wrap setting changes must reconfigure the editor.");
expect(source.includes("vimCompartment.reconfigure(props.vimMode ? vim() : [])"), "Vim setting changes must reconfigure the editor.");

for (const shortcut of ["Mod-s", "Mod-b", "Mod-i", "Mod-k", "Mod-\\\\", "Mod-Shift-f", "F11"]) {
  expect(source.includes(`key: "${shortcut}"`), `Editor shortcut missing: ${shortcut}.`);
}

expect(source.includes("getProps().onSave()"), "Ctrl+S must invoke save.");
expect(source.includes("getProps().onToggleView()"), "Ctrl+Backslash must toggle view.");
expect(source.includes("getProps().onOpenFind()"), "Ctrl+Shift+F must open find and replace.");
expect(source.includes("document.documentElement.requestFullscreen()"), "F11 must request fullscreen.");
expect(source.includes("document.exitFullscreen()"), "F11 must exit fullscreen.");

expect(source.includes("event.clipboardData?.files"), "Paste handler must inspect image files.");
expect(source.includes("getProps().onImageFiles(files)"), "Paste/drop image files must go through the Drive image upload callback.");
expect(source.includes("event.clipboardData?.getData(\"text/html\")"), "Paste handler must inspect HTML clipboard content.");
expect(source.includes("getProps().onSmartHtmlPaste(html)"), "HTML paste must go through Turndown conversion.");
expect(source.includes("/^https?:\\/\\//.test(text)"), "URL paste on selection must create markdown links.");
expect(source.includes("event.dataTransfer?.files"), "Drop handler must inspect dropped image files.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Editor invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
