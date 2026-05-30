import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const css = (await readFile(resolve(root, "src/app/styles.css"), "utf8")).replace(/\r\n/g, "\n");
const failures: string[] = [];

for (const theme of ["light", "dracula", "nord", "solarized"]) {
  const block = extractBlock(`html[data-theme="${theme}"]`);
  expect(Boolean(block), `Missing ${theme} theme block.`);
  if (block) {
    for (const token of ["--bg:", "--panel:", "--panel-2:", "--text:", "--muted:", "--border:", "--accent:"]) {
      expect(block.includes(token), `${theme} theme must define ${token}`);
    }
  }
}

const rootBlock = extractBlock(":root");
expect(rootBlock?.includes("--bg: #0d1117"), "Dark theme must use #0d1117 background.");
expect(rootBlock?.includes("--accent: #2dd4bf"), "Dark theme must use #2DD4BF accent.");

expect(css.includes("transition: background 200ms ease, color 200ms ease"), "Theme changes must transition background and text color over 200ms.");
expect(css.includes("grid-template-rows: 48px auto 40px auto 1fr 28px 40px"), "App shell must reserve site chrome, toolbar, workspace, status, and footer rows.");
expect(css.includes(".site-topbar") && css.includes("height: 48px"), "Site topbar must be 48px tall.");
expect(css.includes(".seo-bar"), "SEO summary bar must exist.");
expect(css.includes(".site-footer") && css.includes("height: 40px"), "Site footer must be 40px tall.");
expect(extractBlock(".toolbar")?.includes("height: 40px"), "Toolbar must be 40px tall.");
expect(extractBlock(".toolbar button,\n.rail button,\n.file-row > button:last-child")?.includes("width: 28px"), "Toolbar icon buttons must be 28px wide.");
expect(extractBlock(".toolbar button,\n.rail button,\n.file-row > button:last-child")?.includes("height: 28px"), "Toolbar icon buttons must be 28px tall.");

expect(css.includes('font-family: "JetBrains Mono", ui-monospace, monospace'), "Editor must use JetBrains Mono.");
expect(css.includes("font-family: Lora, Georgia, serif"), "Preview/print body must use Lora fallback stack.");
expect(css.includes("font-family: Geist, system-ui, sans-serif"), "UI must use Geist fallback stack.");

const mobile500 = extractAtRule("@media (max-width: 500px)");
expect(Boolean(mobile500), "Missing max-width 500px responsive panel.");
expect(mobile500?.includes(".sidebar") && mobile500.includes("display: none"), "Sidebar must collapse below 500px.");
expect(mobile500?.includes(".overflow") && mobile500.includes("display: none"), "Toolbar overflow group must hide below 500px.");
expect(mobile500?.includes(".toolbar-more") && mobile500.includes("display: block"), "Toolbar more menu must show below 500px.");

const mobile400 = extractAtRule("@media (max-width: 400px)");
expect(Boolean(mobile400), "Missing max-width 400px responsive panel.");
expect(mobile400?.includes(".preview-pane") && mobile400.includes("display: none"), "Preview pane must collapse below 400px.");

const print = extractAtRule("@media print");
expect(Boolean(print), "Missing print stylesheet.");
expect(print?.includes(".toolbar,") && print.includes("display: none"), "Print CSS must hide app chrome.");
expect(print?.includes(".editor-host") && print.includes("display: none"), "Print CSS must hide editor.");
expect(print?.includes(".preview-pane") && print.includes("font-family: Lora, Georgia, serif"), "Print CSS must render preview in serif body.");
expect(print?.includes(".print-header,") && print.includes("display: block"), "Print CSS must show frontmatter header and ToC.");
expect(print?.includes("@bottom-center") && print.includes("content: counter(page)"), "Print CSS must include page numbers.");

expect(css.includes("scrollbar-width: thin"), "Thin Firefox scrollbars must be enabled.");
expect(css.includes("::-webkit-scrollbar") && css.includes("width: 8px"), "Thin WebKit scrollbars must be enabled.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("UI invariants passed.");

function extractBlock(selector: string): string | null {
  const start = css.indexOf(selector);
  if (start === -1) return null;
  const bodyStart = css.indexOf("{", start);
  if (bodyStart === -1) return null;
  return readBalancedBlock(bodyStart);
}

function extractAtRule(rule: string): string | null {
  const start = css.indexOf(rule);
  if (start === -1) return null;
  const bodyStart = css.indexOf("{", start);
  if (bodyStart === -1) return null;
  return readBalancedBlock(bodyStart);
}

function readBalancedBlock(bodyStart: number): string | null {
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
