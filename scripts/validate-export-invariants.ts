import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const app = await readFile(resolve(root, "src/app/main.tsx"), "utf8");
const preview = await readFile(resolve(root, "src/app/preview-pane.tsx"), "utf8");
const css = await readFile(resolve(root, "src/app/styles.css"), "utf8");
const failures: string[] = [];

expect(app.includes("const exportMarkdown = useCallback"), "Markdown export action must exist.");
expect(app.includes("downloadBlob(document.name, \"text/markdown\", document.markdown)"), "Markdown export must download the exact editor contents.");
expect(app.includes("title: \"Markdown export failed\""), "Markdown export failures must show user feedback.");
expect(app.includes("anchor.download = sanitizeDownloadName(name)"), "Exports must sanitize unsafe local download filenames.");
expect(app.includes("try {\n    anchor.href = url;"), "Exports must wrap synthetic download clicks for cleanup.");
expect(app.includes("globalThis.document.body.append(anchor)"), "Exports must attach synthetic download links for browser compatibility.");
expect(app.includes("} finally {\n    anchor.remove();\n    URL.revokeObjectURL(url);"), "Exports must always remove synthetic links and revoke object URLs.");
expect(app.includes("function sanitizeDownloadName"), "Export filename sanitizer must exist.");
expect(app.includes("replace(/[\\x00-\\x1f<>:\"/\\\\|?*]+/g, \"-\")"), "Export filename sanitizer must strip control and filesystem-reserved characters.");
expect(app.includes("replace(/[. ]+$/g, \"\")"), "Export filename sanitizer must strip trailing dots and spaces.");
expect(app.includes("/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\\..*)?$/i.test(cleaned)"), "Export filename sanitizer must reject reserved Windows device names.");
expect(app.includes("function fallbackDownloadName(name: string): string"), "Export filename sanitizer must provide stable extension-aware fallbacks.");
expect(app.includes("return /\\.html$/i.test(name) ? \"MarkDrive-export.html\" : \"MarkDrive-export.md\";"), "Export filename fallback must preserve HTML and Markdown export extensions.");
expect(app.includes("const exportHtml = useCallback"), "HTML export action must exist.");
expect(app.includes("buildSelfContainedHtml(document.name, document.markdown, hljs, highlightCss, settings.theme)"), "HTML export must render the current document with a highlighter.");
expect(app.includes("import(\"./highlight-languages\")"), "HTML export must lazy-load the highlight registry.");
expect(app.includes("highlight.js/styles/") && app.includes(".css?inline"), "HTML export must inline theme-aware highlight CSS.");
expect(app.includes("const highlightTheme ="), "HTML export must select highlight CSS based on theme.");
expect(app.includes("function exportPageTheme"), "HTML export must include theme-aware page styling.");
expect(app.includes("downloadBlob(`${document.name.replace(/\\.md$/i, \"\")}.html`, \"text/html\", html)"), "HTML export must download an HTML file.");
expect(app.includes("pushToast({ tone: \"danger\", title: \"HTML export failed\""), "HTML export failures must show user feedback.");

expect(app.includes("function buildSelfContainedHtml"), "Self-contained HTML builder must exist.");
expect(app.includes("<!doctype html>"), "Self-contained HTML must include a doctype.");
expect(app.includes("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"), "Self-contained HTML must include responsive metadata.");
expect(app.includes("const frontmatter = readFrontmatter(markdown)"), "Self-contained HTML must read frontmatter.");
expect(app.includes("const outline = extractOutline(markdown)"), "Self-contained HTML must build a ToC from headings.");
expect(app.includes("<nav class=\"toc\"><h2>Contents</h2>"), "Self-contained HTML must include a ToC when headings exist.");
expect(app.includes("${highlightCss}"), "Self-contained HTML must inline syntax highlight CSS.");
expect(app.includes("<article>${renderMarkdown(markdown, codeHighlighter)}</article>"), "Self-contained HTML must include rendered markdown.");
expect(app.includes("escapeHtml(title)"), "Self-contained HTML must escape title/frontmatter values.");
expect(app.includes("@bottom-center{content:counter(page)}"), "Self-contained HTML print CSS must include page numbers.");

expect(app.includes("const exportPdf = useCallback"), "PDF export action must exist.");
expect(app.includes("setViewMode(\"preview\")"), "PDF export must switch to preview before printing.");
expect(app.includes("setPdfPrintRequest(requestId)"), "PDF export must request a fresh preview render before printing.");
expect(app.includes("pendingPrintRequestRef.current !== requestId"), "PDF export must ignore stale preview print-ready signals.");
expect(app.includes("schedulePrintViewRestore"), "PDF export must restore the prior layout after printing.");
expect(app.includes("Print export timed out"), "PDF export must recover when preview print preparation stalls.");
expect(preview.includes("printRequestId?: number"), "Preview must accept explicit PDF print requests.");
expect(preview.includes("if (printRequestId > 0) setPreviewMarkdown(markdown);"), "Preview must flush the latest markdown for PDF print requests.");
expect(preview.includes("onPrintReady?.(printRequestId)"), "Preview must signal when the requested PDF render is ready.");
expect(app.includes("window.print();"), "PDF export must call print after preview renders.");
expect(app.includes("viewModeBeforePrintRef"), "PDF export must remember the prior view mode.");
expect(app.includes("afterprint"), "PDF export must restore the prior view mode after printing.");
expect(app.includes("schedulePrintViewRestore"), "PDF export must restore view mode when print fails or times out.");
expect(app.includes("title: \"PDF export failed\""), "PDF export failures must show user feedback.");
expect(app.includes("title: \"Exported Markdown\""), "Markdown export successes must show user feedback.");
expect(app.includes("title: \"Print dialog opened\""), "PDF export successes must show user feedback.");

for (const label of ["Export Markdown", "Export HTML", "Export PDF"]) {
  expect(app.includes(`title="${label}"`) || app.includes(`> ${label}<`), `Toolbar must expose ${label}.`);
  expect(app.includes(`role="menuitem"`) && app.includes(label), `Overflow menu must expose ${label}.`);
}

expect(preview.includes("className=\"print-header\""), "Preview must render a print frontmatter header.");
expect(preview.includes("className=\"print-toc\""), "Preview must render a print ToC.");
expect(preview.includes("printFrontmatter"), "Preview print header must use frontmatter.");
expect(preview.includes("printOutline"), "Preview print ToC must use outline headings.");

const printCss = extractAtRule("@media print");
expect(Boolean(printCss), "Print stylesheet must exist.");
expect(printCss?.includes(".toolbar,") && printCss.includes("display: none"), "Print CSS must hide toolbar chrome.");
expect(printCss?.includes(".editor-host") && printCss.includes("display: none"), "Print CSS must hide the editor.");
expect(printCss?.includes(".preview-pane") && printCss.includes("font-family: Lora, Georgia, serif"), "Print CSS must use serif preview body.");
expect(printCss?.includes(".print-header,") && printCss.includes(".print-toc"), "Print CSS must show frontmatter header and ToC.");
expect(printCss?.includes("@bottom-center") && printCss.includes("content: counter(page)"), "Print CSS must include page numbers.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Export invariants passed.");

function extractAtRule(rule: string): string | null {
  const start = css.indexOf(rule);
  if (start === -1) return null;
  const bodyStart = css.indexOf("{", start);
  if (bodyStart === -1) return null;
  let depth = 0;
  for (let index = bodyStart; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(bodyStart + 1, index);
  }
  return null;
}

function expect(condition: boolean | undefined, message: string): void {
  if (!condition) failures.push(message);
}
