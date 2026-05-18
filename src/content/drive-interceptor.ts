import { sendMessage } from "../shared/messages";

const markdownNamePattern = /\.m(?:ark)?d(?:own)?$/i;
const contextStorageKey = "markdrive.contextTarget";
let scanScheduled = false;

document.addEventListener("click", (event) => {
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) return;
  const fileId = extractFileId(anchor.href) ?? extractFileIdFromElement(anchor);
  const label = anchor.getAttribute("aria-label") ?? anchor.textContent ?? "";
  if (!fileId || !markdownNamePattern.test(label)) return;

  event.preventDefault();
  event.stopPropagation();
  void sendMessage({ type: "app:open", fileId, folderId: extractFolderId(location.href) });
});

document.addEventListener("contextmenu", (event) => {
  const row = (event.target as Element | null)?.closest<HTMLElement>("a[href], [data-id], [aria-label]");
  if (!row) return;
  const label = row.getAttribute("aria-label") ?? row.textContent ?? "";
  if (!markdownNamePattern.test(label)) return;
  row.setAttribute("data-markdrive-markdown", "true");
  const fileId = row instanceof HTMLAnchorElement ? extractFileId(row.href) : extractFileIdFromElement(row);
  if (fileId) {
    void chrome.storage.session.set({
      [contextStorageKey]: {
        fileId,
        folderId: extractFolderId(location.href),
        capturedAt: Date.now()
      }
    });
  }
});

new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
scheduleScan();

function scheduleScan(): void {
  if (scanScheduled) return;
  scanScheduled = true;
  window.requestAnimationFrame(() => {
    scanScheduled = false;
    markMarkdownRows();
  });
}

function markMarkdownRows(): void {
  const startedAt = performance.now();
  const candidates = document.querySelectorAll<HTMLElement>("a[href], [data-id][aria-label], [data-tooltip]");
  for (const element of candidates) {
    const label = element.getAttribute("aria-label") ?? element.getAttribute("data-tooltip") ?? "";
    if (markdownNamePattern.test(label)) {
      element.dataset.markdriveMarkdown = "true";
      element.style.setProperty("--markdrive-accent", "#2DD4BF");
    }
    if (performance.now() - startedAt > 4) break;
  }
}

function extractFileId(url: string): string | null {
  const match = /\/file\/d\/([^/]+)/.exec(url) ?? /[?&]id=([^&]+)/.exec(url);
  return match?.[1] ?? null;
}

function extractFileIdFromElement(element: Element): string | null {
  const host = element.closest<HTMLElement>("[data-id], [data-target], [data-doc-id]");
  return host?.dataset.id ?? host?.dataset.target ?? host?.dataset.docId ?? null;
}

function extractFolderId(url: string): string | null {
  const match = /\/folders\/([^/?]+)/.exec(url) ?? /\/drive\/u\/\d+\/folders\/([^/?]+)/.exec(url);
  return match?.[1] ?? null;
}
