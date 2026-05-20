import { sendMessage } from "../shared/messages";
import { cleanDriveId, extractDriveFileIdFromUrl, extractDriveFolderIdFromUrl } from "../shared/drive-url";

const markdownNamePattern = /\.m(?:ark)?d(?:own)?$/i;
const contextStorageKey = "markdrive.contextTarget";
let scanScheduled = false;
let noticeTimer: number | null = null;

function isMarkdownLabel(label: string): boolean {
  const normalized = label.trim();
  return markdownNamePattern.test(normalized) || /\b[\w.-]+\.md(?:own)?\b/i.test(normalized);
}

document.addEventListener("click", (event) => {
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) return;
  const fileId = extractDriveFileIdFromUrl(anchor.href) ?? extractFileIdFromElement(anchor);
  const label = anchor.getAttribute("aria-label") ?? anchor.textContent ?? "";
  if (!fileId || !isMarkdownLabel(label)) return;

  event.preventDefault();
  event.stopPropagation();
  void openInMarkDrive(fileId, extractDriveFolderIdFromUrl(location.href));
});

document.addEventListener("contextmenu", (event) => {
  const row = (event.target as Element | null)?.closest<HTMLElement>("a[href], [data-id], [aria-label]");
  if (!row) return;
  const label = row.getAttribute("aria-label") ?? row.textContent ?? "";
  if (!isMarkdownLabel(label)) return;
  row.setAttribute("data-markdrive-markdown", "true");
  const fileId = row instanceof HTMLAnchorElement ? extractDriveFileIdFromUrl(row.href) : extractFileIdFromElement(row);
  if (fileId) {
    void captureContextTarget(fileId, extractDriveFolderIdFromUrl(location.href));
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
    const label = element.getAttribute("aria-label") ?? element.getAttribute("data-tooltip") ?? element.textContent ?? "";
    if (isMarkdownLabel(label)) {
      element.dataset.markdriveMarkdown = "true";
      element.style.setProperty("--markdrive-accent", "#2DD4BF");
    }
    if (performance.now() - startedAt > 4) break;
  }
}

function extractFileIdFromElement(element: Element): string | null {
  const host = element.closest<HTMLElement>("[data-id], [data-target], [data-doc-id]");
  return cleanDriveId(host?.dataset.id ?? host?.dataset.target ?? host?.dataset.docId);
}

async function openInMarkDrive(fileId: string, folderId: string | null): Promise<void> {
  try {
    const response = await sendMessage({ type: "app:open", fileId, folderId });
    if (!response.ok) showMarkDriveNotice(`MarkDrive could not open this file. ${response.message}`);
  } catch (failure) {
    showMarkDriveNotice(`MarkDrive could not open this file. ${describeUnknownError(failure)}`);
  }
}

async function captureContextTarget(fileId: string, folderId: string | null): Promise<void> {
  try {
    await chrome.storage.session.set({
      [contextStorageKey]: {
        fileId,
        folderId,
        capturedAt: Date.now()
      }
    });
  } catch (failure) {
    showMarkDriveNotice(`MarkDrive could not prepare the Drive context menu. ${describeUnknownError(failure)}`);
  }
}

function showMarkDriveNotice(message: string): void {
  let notice = document.getElementById("markdrive-content-error");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "markdrive-content-error";
    notice.setAttribute("role", "alert");
    notice.setAttribute("aria-live", "assertive");
    Object.assign(notice.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483647",
      maxWidth: "360px",
      padding: "12px 14px",
      border: "1px solid rgba(45, 212, 191, 0.45)",
      borderRadius: "8px",
      background: "#0d1117",
      color: "#f8fafc",
      boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
      font: "13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    });
    document.documentElement.append(notice);
  }
  notice.textContent = message;
  if (noticeTimer) window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    notice?.remove();
    noticeTimer = null;
  }, 6000);
}

function describeUnknownError(failure: unknown): string {
  return failure instanceof Error ? failure.message : "Unexpected extension runtime failure.";
}
