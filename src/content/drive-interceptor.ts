import { sendMessage } from "../shared/messages";

const markdownNamePattern = /\.m(?:ark)?d(?:own)?$/i;
const scanIntervalMs = 1500;

document.addEventListener("click", (event) => {
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) return;
  const fileId = extractFileId(anchor.href);
  const label = anchor.getAttribute("aria-label") ?? anchor.textContent ?? "";
  if (!fileId || !markdownNamePattern.test(label)) return;

  event.preventDefault();
  event.stopPropagation();
  void sendMessage({ type: "app:open", fileId, folderId: extractFolderId(location.href) });
});

document.addEventListener("contextmenu", (event) => {
  const row = (event.target as Element | null)?.closest("[data-id], [aria-label]");
  if (!row) return;
  const label = row.getAttribute("aria-label") ?? row.textContent ?? "";
  if (!markdownNamePattern.test(label)) return;
  row.setAttribute("data-markdrive-markdown", "true");
});

setInterval(markMarkdownRows, scanIntervalMs);
markMarkdownRows();

function markMarkdownRows(): void {
  const candidates = document.querySelectorAll<HTMLElement>("[aria-label], [data-tooltip]");
  for (const element of candidates) {
    const label = element.getAttribute("aria-label") ?? element.getAttribute("data-tooltip") ?? "";
    if (markdownNamePattern.test(label)) {
      element.dataset.markdriveMarkdown = "true";
      element.style.setProperty("--markdrive-accent", "#2DD4BF");
    }
  }
}

function extractFileId(url: string): string | null {
  const match = /\/file\/d\/([^/]+)/.exec(url) ?? /[?&]id=([^&]+)/.exec(url);
  return match?.[1] ?? null;
}

function extractFolderId(url: string): string | null {
  const match = /\/folders\/([^/?]+)/.exec(url) ?? /\/drive\/u\/\d+\/folders\/([^/?]+)/.exec(url);
  return match?.[1] ?? null;
}
