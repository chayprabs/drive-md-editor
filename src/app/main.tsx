import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bold,
  Braces,
  Check,
  Columns2,
  Download,
  Eye,
  FileDown,
  FilePlus2,
  FolderOpen,
  Italic,
  Link,
  MoreHorizontal,
  Moon,
  PanelLeft,
  Save,
  Search,
  Settings,
  Sun,
  Upload,
  WrapText
} from "lucide-react";
import TurndownService from "turndown";
import { DriveIssueModal, type DriveIssue } from "./drive-issue-modal";
import { EmptyState } from "./empty-state";
import { FindReplaceBar, type FindReplaceState } from "./find-replace-bar";
import { MarkdownEditor, type MarkdownEditorHandle } from "./markdown-editor";
import { Onboarding } from "./onboarding";
import { PreviewPane } from "./preview-pane";
import { Sidebar } from "./sidebar";
import { Toasts, useToasts } from "./toasts";
import { ConflictModal } from "./conflict-modal";
import { sendMessage } from "../shared/messages";
import { markdownWithoutFrontmatter, readFrontmatter, writeFrontmatter } from "../shared/frontmatter";
import { extractOutline, readingTimeMinutes, renderMarkdown, type CodeHighlighter } from "../shared/markdown";
import { loadOfflineQueue, markQueuedSaveAttempt, queueOfflineSave, removeQueuedSave } from "../shared/offline-queue";
import { loadRecents, rememberDocument, rememberDriveFile } from "../shared/recents";
import { defaultSettings, saveSettings } from "../shared/settings";
import { summarizeSearch } from "../shared/search";
import type { MarkDriveSettings, OpenDocument, RecentFile, SaveConflict, ThemeName, ViewMode } from "../shared/types";
import "./styles.css";

const emptyMarkdown = `---
title: Untitled
date: ${new Date().toISOString().slice(0, 10)}
tags: []
author: ""
draft: false
---

# Untitled

Start writing in MarkDrive.
`;

function App(): React.ReactElement {
  const [settings, setSettings] = useState<MarkDriveSettings>(defaultSettings);
  const [document, setDocument] = useState<OpenDocument>({
    fileId: null,
    name: "Untitled.md",
    markdown: emptyMarkdown,
    modifiedTime: null,
    folderId: new URLSearchParams(location.search).get("folderId"),
    localVersion: Date.now()
  });
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [activeSidebar, setActiveSidebar] = useState<"outline" | "drive" | "frontmatter">("outline");
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "offline" | "error">("idle");
  const [conflict, setConflict] = useState<SaveConflict | null>(null);
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<RecentFile[]>([]);
  const [showEmptyState, setShowEmptyState] = useState(() => new URLSearchParams(location.search).get("fileId") === null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [browserFolderId, setBrowserFolderId] = useState<string | null>(() => new URLSearchParams(location.search).get("folderId"));
  const [driveIssue, setDriveIssue] = useState<DriveIssue | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [findOpen, setFindOpen] = useState(false);
  const [findState, setFindState] = useState<FindReplaceState>({
    query: "",
    replacement: "",
    caseSensitive: false,
    wholeWord: false,
    regex: false
  });
  const [overflowOpen, setOverflowOpen] = useState(false);
  const { toasts, pushToast, dismissToast } = useToasts();
  const editorRef = useRef<MarkdownEditorHandle | null>(null);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const dirtyRef = useRef(false);
  const documentRef = useRef(document);
  const retryTimerRef = useRef<number | null>(null);
  documentRef.current = document;

  const outline = useMemo(() => extractOutline(document.markdown), [document.markdown]);
  const frontmatter = useMemo(() => readFrontmatter(document.markdown), [document.markdown]);
  const stats = useMemo(() => {
    const content = markdownWithoutFrontmatter(document.markdown);
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    return {
      words,
      chars: document.markdown.length,
      reading: readingTimeMinutes(document.markdown)
    };
  }, [document.markdown]);
  const findSummary = useMemo(() => summarizeSearch(document.markdown, findState), [document.markdown, findState]);

  useEffect(() => {
    void sendMessage({ type: "settings:get" }).then((response) => {
      if (response.ok && "settings" in response) {
        setSettings(response.settings);
        if (!response.settings.onboardingComplete || new URLSearchParams(location.search).get("onboarding") === "1") {
          setShowOnboarding(true);
        }
        const folderFromUrl = new URLSearchParams(location.search).get("folderId");
        if (!folderFromUrl && response.settings.lastFolderId) {
          setBrowserFolderId(response.settings.lastFolderId);
        }
      }
    });
    void loadRecents().then(setRecents);
    const fileId = new URLSearchParams(location.search).get("fileId");
    if (fileId) void openFile(fileId);
  }, []);

  useEffect(() => {
    documentElement().dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    if (!overflowOpen) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!overflowRef.current?.contains(event.target as Node)) setOverflowOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOverflowOpen(false);
    };
    globalThis.document.addEventListener("mousedown", closeOnOutside);
    globalThis.document.addEventListener("keydown", closeOnEscape);
    return () => {
      globalThis.document.removeEventListener("mousedown", closeOnOutside);
      globalThis.document.removeEventListener("keydown", closeOnEscape);
    };
  }, [overflowOpen]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);

  useEffect(() => {
    if (settings.autosaveInterval === 0 || !dirtyRef.current) return;
    const timer = window.setTimeout(() => void saveCurrent("autosave"), settings.autosaveInterval);
    return () => window.clearTimeout(timer);
  }, [document.markdown, settings.autosaveInterval]);

  useEffect(() => {
    const retry = () => {
      void retryOfflineQueue();
    };
    window.addEventListener("online", retry);
    if (navigator.onLine) retry();
    return () => window.removeEventListener("online", retry);
  }, []);

  const openFile = useCallback(async (fileId: string) => {
    const response = await sendMessage({ type: "drive:get-file", fileId });
    if (!response.ok) {
      pushToast({ tone: "danger", title: "Could not open file", detail: response.message });
      return;
    }
    if (!("file" in response)) {
      pushToast({ tone: "danger", title: "Could not open file", detail: "Drive returned an unexpected response." });
      return;
    }
    setDocument({
      fileId: response.file.id,
      name: response.file.name,
      markdown: response.markdown,
      modifiedTime: response.file.modifiedTime,
      folderId: response.file.parents?.[0] ?? null,
      localVersion: Date.now()
    });
    setBrowserFolderId(response.file.parents?.[0] ?? null);
    setRecents(await rememberDriveFile(response.file));
    setShowEmptyState(false);
    dirtyRef.current = false;
    setSaveState("idle");
  }, [pushToast]);

  const saveCurrent = useCallback(async (
    source: "manual" | "autosave" | "vim" = "manual",
    target: OpenDocument = document
  ) => {
    if (!navigator.onLine) {
      setSaveState("offline");
      await queueOfflineSave(target);
      pushToast({ tone: "warning", title: "Offline", detail: "Changes are queued locally and will retry when online." });
      return;
    }

    setSaveState("saving");
    const response = target.fileId
      ? await sendMessage({
          type: "drive:save-file",
          fileId: target.fileId,
          markdown: target.markdown,
          previousModifiedTime: target.modifiedTime
        })
      : await sendMessage({
          type: "drive:create-file",
          name: target.name,
          markdown: target.markdown,
          folderId: target.folderId
        });

    if (response.ok && "document" in response) {
      const syncedCurrentDocument = documentRef.current.localVersion === target.localVersion;
      setDocument((current) => {
        if (current.localVersion === target.localVersion) return response.document;
        const sameDriveTarget = current.fileId === target.fileId || target.fileId === null;
        return sameDriveTarget
          ? {
              ...current,
              fileId: response.document.fileId,
              name: response.document.name,
              modifiedTime: response.document.modifiedTime,
              folderId: response.document.folderId
            }
          : current;
      });
      setBrowserFolderId(response.document.folderId);
      setRecents(await rememberDocument(response.document));
      setShowEmptyState(false);
      if (syncedCurrentDocument) {
        dirtyRef.current = false;
        setSaveState("saved");
        if (source !== "autosave") pushToast({ tone: "success", title: "Saved to Drive" });
      } else {
        dirtyRef.current = true;
        setSaveState("dirty");
        if (source !== "autosave") pushToast({ tone: "success", title: "Saved snapshot", detail: "Newer local edits still need saving." });
      }
      return;
    }

    if (!response.ok && response.status === 409) {
      try {
        const drive = JSON.parse(response.message) as { markdown: string; modifiedTime: string };
        setConflict({ local: target, drive });
        setSaveState("error");
        return;
      } catch {
        setSaveState("error");
      }
    }

    setSaveState("error");
    if (!response.ok) {
      const detail = describeDriveError(response.status, response.message);
      pushToast({ tone: "danger", title: "Save failed", detail });
      handleDriveFailure(response.status, detail, response.retryAfterMs);
    }
  }, [document, pushToast]);

  const retryOfflineQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const queue = await loadOfflineQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      await markQueuedSaveAttempt(item.id);
      const response = item.document.fileId
        ? await sendMessage({
            type: "drive:save-file",
            fileId: item.document.fileId,
            markdown: item.document.markdown,
            previousModifiedTime: item.document.modifiedTime
          })
        : await sendMessage({
            type: "drive:create-file",
            name: item.document.name,
            markdown: item.document.markdown,
            folderId: item.document.folderId
          });

      if (response.ok && "document" in response) {
        await removeQueuedSave(item.id);
        const syncedCurrentDocument = documentRef.current.localVersion === item.document.localVersion;
        if (syncedCurrentDocument) {
          setDocument(response.document);
          dirtyRef.current = false;
          setSaveState("saved");
        }
        setRecents(await rememberDocument(response.document));
        pushToast({ tone: "success", title: "Queued save synced", detail: response.document.name });
        continue;
      }

      if (!response.ok) {
        handleDriveFailure(response.status, describeDriveError(response.status, response.message), response.retryAfterMs);
        break;
      }
    }
  }, [pushToast]);

  const handleDriveFailure = useCallback((status: number | undefined, message: string, retryAfterMs?: number) => {
    if (status === 401) {
      setDriveIssue({ kind: "auth", message });
      return;
    }
    if (status === 403) {
      setDriveIssue({ kind: "permission", message });
      return;
    }
    if (status === 404) {
      setDriveIssue({ kind: "deleted", message });
      return;
    }
    if (status === 429) {
      const delay = retryAfterMs ?? 4000;
      setDriveIssue({ kind: "rate-limit", message, retryAfterMs: delay });
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(() => void saveCurrent("manual"), delay);
    }
  }, [saveCurrent]);

  const changeMarkdown = useCallback((markdown: string) => {
    setDocument((current) => ({ ...current, markdown, localVersion: Date.now() }));
    dirtyRef.current = true;
    setSaveState("dirty");
  }, []);

  const updateFrontmatter = useCallback((next: typeof frontmatter) => {
    changeMarkdown(writeFrontmatter(document.markdown, next));
  }, [changeMarkdown, document.markdown]);

  const updateSettings = useCallback(async (update: Partial<MarkDriveSettings>) => {
    const next = { ...settings, ...update };
    setSettings(next);
    await saveSettings(next);
  }, [settings]);

  const command = useCallback((kind: "bold" | "italic" | "link") => {
    editorRef.current?.formatSelection(kind);
  }, []);

  const openFindReplace = useCallback(() => {
    if (viewMode === "preview") setViewMode("split");
    setFindOpen(true);
  }, [viewMode]);

  const findInEditor = useCallback((direction: "next" | "previous") => {
    const matches = editorRef.current?.find(findState, direction) ?? 0;
    if (findState.query && matches === 0) {
      pushToast({ tone: findSummary.invalid ? "danger" : "warning", title: findSummary.invalid ? "Invalid search pattern" : "No matches" });
    }
  }, [findState, findSummary.invalid, pushToast]);

  const replaceCurrent = useCallback(() => {
    const replaced = editorRef.current?.replaceCurrent(findState, findState.replacement) ?? 0;
    if (findState.query && replaced === 0 && findSummary.matches === 0) {
      pushToast({ tone: findSummary.invalid ? "danger" : "warning", title: findSummary.invalid ? "Invalid search pattern" : "No matches" });
    }
  }, [findState, findSummary.invalid, findSummary.matches, pushToast]);

  const replaceAllInEditor = useCallback(() => {
    const replaced = editorRef.current?.replaceAll(findState, findState.replacement) ?? 0;
    pushToast({
      tone: replaced > 0 ? "success" : "warning",
      title: replaced > 0 ? "Replaced matches" : "No matches",
      detail: replaced > 0 ? `${replaced} replacements made.` : undefined
    });
  }, [findState, pushToast]);

  const newDocument = useCallback(() => {
    setDocument({
      fileId: null,
      name: "Untitled.md",
      markdown: emptyMarkdown,
      modifiedTime: null,
      folderId: document.folderId,
      localVersion: Date.now()
    });
    dirtyRef.current = false;
    setSaveState("idle");
    setShowEmptyState(false);
  }, [document.folderId]);

  const importPaste = useCallback((html: string) => {
    const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
    editorRef.current?.insertText(turndown.turndown(html));
  }, []);

  const uploadImages = useCallback(async (files: File[]) => {
    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await sendMessage({
        type: "drive:upload-image",
        name: file.name || `markdrive-image-${Date.now()}.png`,
        mimeType: file.type || "image/png",
        dataUrl,
        folderId: document.folderId
      });
      if (response.ok && "imageMarkdown" in response) {
        editorRef.current?.insertText(`\n${response.imageMarkdown}\n`);
        pushToast({ tone: "success", title: "Image uploaded" });
      } else if (!response.ok) {
        pushToast({ tone: "danger", title: "Image upload failed", detail: response.message });
      }
    }
  }, [document.folderId, pushToast]);

  const exportHtml = useCallback(() => {
    void (async () => {
      try {
        const [{ default: hljs }, { default: highlightCss }] = await Promise.all([
          import("./highlight-languages"),
          import("highlight.js/styles/github-dark.css?inline")
        ]);
        const html = buildSelfContainedHtml(document.name, document.markdown, hljs, highlightCss);
        downloadBlob(`${document.name.replace(/\.md$/i, "")}.html`, "text/html", html);
      } catch (error) {
        pushToast({ tone: "danger", title: "HTML export failed", detail: error instanceof Error ? error.message : "Unable to build the export." });
      }
    })();
  }, [document.markdown, document.name, pushToast]);

  const exportMarkdown = useCallback(() => {
    downloadBlob(document.name, "text/markdown", document.markdown);
  }, [document.markdown, document.name]);

  const exportPdf = useCallback(() => {
    setViewMode("preview");
    window.requestAnimationFrame(() => window.print());
  }, []);

  return (
    <main className="app-shell">
      <header className="toolbar">
        <div className="brand">
          <img src="/icon.svg" alt="" />
          <span>MarkDrive</span>
        </div>
        <div className="toolbar-group">
          <button title="New file" onClick={newDocument}><FilePlus2 size={16} /></button>
          <button title="Save" onClick={() => void saveCurrent("manual")}><Save size={16} /></button>
          <button title="Bold" onClick={() => command("bold")}><Bold size={16} /></button>
          <button title="Italic" onClick={() => command("italic")}><Italic size={16} /></button>
          <button title="Link" onClick={() => command("link")}><Link size={16} /></button>
          <button title="Find and replace" aria-pressed={findOpen} onClick={openFindReplace}><Search size={16} /></button>
        </div>
        <div className="toolbar-group">
          <button title="Split view" aria-pressed={viewMode === "split"} onClick={() => setViewMode("split")}><Columns2 size={16} /></button>
          <button title="Editor only" aria-pressed={viewMode === "editor"} onClick={() => setViewMode("editor")}><Braces size={16} /></button>
          <button title="Preview only" aria-pressed={viewMode === "preview"} onClick={() => setViewMode("preview")}><Eye size={16} /></button>
          <button title="Soft wrap" aria-pressed={settings.softWrap} onClick={() => void updateSettings({ softWrap: !settings.softWrap })}><WrapText size={16} /></button>
          <button title={`Theme: ${settings.theme}`} onClick={() => void updateSettings({ theme: nextTheme(settings.theme) })}>{settings.theme === "light" || settings.theme === "solarized" ? <Sun size={16} /> : <Moon size={16} />}</button>
        </div>
        <div className="toolbar-group overflow">
          <button title="Export Markdown" onClick={exportMarkdown}><Download size={16} /></button>
          <button title="Export HTML" onClick={exportHtml}><Upload size={16} /></button>
          <button title="Export PDF" onClick={exportPdf}><FileDown size={16} /></button>
          <button title="Options" onClick={() => chrome.runtime.openOptionsPage()}><Settings size={16} /></button>
        </div>
        <div className="toolbar-more" ref={overflowRef}>
          <button
            title="More actions"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen((open) => !open)}
          >
            <MoreHorizontal size={16} />
          </button>
          {overflowOpen ? (
            <div className="toolbar-menu" role="menu">
              <button role="menuitem" onClick={() => { setOverflowOpen(false); exportMarkdown(); }}><Download size={14} /> Export Markdown</button>
              <button role="menuitem" onClick={() => { setOverflowOpen(false); exportHtml(); }}><Upload size={14} /> Export HTML</button>
              <button role="menuitem" onClick={() => { setOverflowOpen(false); exportPdf(); }}><FileDown size={14} /> Export PDF</button>
              <button role="menuitem" onClick={() => { setOverflowOpen(false); chrome.runtime.openOptionsPage(); }}><Settings size={14} /> Options</button>
            </div>
          ) : null}
        </div>
      </header>
      <div className="findbar-slot">
        {findOpen ? (
          <FindReplaceBar
            state={findState}
            summary={findSummary}
            onState={setFindState}
            onFind={findInEditor}
            onReplaceCurrent={replaceCurrent}
            onReplaceAll={replaceAllInEditor}
            onClose={() => setFindOpen(false)}
          />
        ) : null}
      </div>

      <section className="workspace">
        <aside className="rail">
          <button title="Outline" aria-pressed={activeSidebar === "outline"} onClick={() => setActiveSidebar("outline")}><PanelLeft size={16} /></button>
          <button title="Drive browser" aria-pressed={activeSidebar === "drive"} onClick={() => setActiveSidebar("drive")}><FolderOpen size={16} /></button>
          <button title="Frontmatter" aria-pressed={activeSidebar === "frontmatter"} onClick={() => setActiveSidebar("frontmatter")}><Check size={16} /></button>
        </aside>
        <Sidebar
          active={activeSidebar}
          outline={outline}
          frontmatter={frontmatter}
          query={query}
          folderId={browserFolderId}
          onQuery={setQuery}
          onFrontmatter={updateFrontmatter}
          onOpenFile={(fileId) => void openFile(fileId)}
          onCreateDocument={(nextDocument) => {
            setDocument(nextDocument);
            setBrowserFolderId(nextDocument.folderId);
            setShowEmptyState(false);
            dirtyRef.current = false;
            setSaveState("saved");
            void rememberDocument(nextDocument).then(setRecents);
          }}
          onFolder={(folderId) => {
            setBrowserFolderId(folderId);
            void updateSettings({ lastFolderId: folderId });
          }}
          onJump={(line) => editorRef.current?.goToLine(line)}
        />
        {showEmptyState ? (
          <EmptyState
            recents={recents}
            onNewFile={newDocument}
            onBrowseDrive={() => {
              setActiveSidebar("drive");
              setShowEmptyState(false);
            }}
            onOpenRecent={(fileId) => void openFile(fileId)}
          />
        ) : (
          <div className={`panes view-${viewMode}`}>
            {viewMode !== "preview" && (
              <MarkdownEditor
                ref={editorRef}
                markdown={document.markdown}
                vimMode={settings.vimMode}
                softWrap={settings.softWrap}
                onChange={changeMarkdown}
                onSave={() => void saveCurrent("manual")}
                onVimSave={() => void saveCurrent("vim")}
                onToggleView={() => setViewMode((current) => current === "split" ? "preview" : current === "preview" ? "editor" : "split")}
                onOpenFind={openFindReplace}
                onSmartHtmlPaste={importPaste}
                onImageFiles={(files) => void uploadImages(files)}
                onCursor={(line, column) => setCursor({ line, column })}
              />
            )}
            {viewMode !== "editor" && <PreviewPane markdown={document.markdown} theme={settings.theme} onChange={changeMarkdown} />}
          </div>
        )}
      </section>

      <footer className="statusbar">
        <span>{document.name}</span>
        <span>{stats.words} words</span>
        <span>{stats.chars} chars</span>
        <span>{stats.reading} min read</span>
        <span>Ln {cursor.line}, Col {cursor.column}</span>
        <span className={`save-state ${saveState}`}>{saveState}</span>
      </footer>
      {conflict && (
        <ConflictModal
          conflict={conflict}
          onKeepMine={() => {
            const local = { ...conflict.local, modifiedTime: conflict.drive.modifiedTime };
            setDocument(local);
            setConflict(null);
            void saveCurrent("manual", local);
          }}
          onKeepDrive={() => {
            setDocument({ ...conflict.local, markdown: conflict.drive.markdown, modifiedTime: conflict.drive.modifiedTime });
            dirtyRef.current = false;
            setConflict(null);
          }}
          onSaveCopy={() => {
            const copy = { ...conflict.local, fileId: null, modifiedTime: null, name: conflict.local.name.replace(/\.md$/i, " copy.md") };
            setDocument(copy);
            setConflict(null);
            void saveCurrent("manual", copy);
          }}
        />
      )}
      {showOnboarding && (
        <Onboarding
          onFinish={() => {
            setShowOnboarding(false);
            void updateSettings({ onboardingComplete: true });
          }}
        />
      )}
      {driveIssue && (
        <DriveIssueModal
          issue={driveIssue}
          onClose={() => setDriveIssue(null)}
          onRetry={() => {
            setDriveIssue(null);
            void saveCurrent("manual");
          }}
          onReauth={() => {
            setDriveIssue(null);
            void sendMessage({ type: "auth:get-token", interactive: true }).then((response) => {
              if (response.ok) void saveCurrent("manual");
              else pushToast({ tone: "danger", title: "Authentication failed", detail: response.message });
            });
          }}
        />
      )}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

function describeDriveError(status: number | undefined, message: string): string {
  if (status === 401) return "Google needs re-authentication before MarkDrive can save.";
  if (status === 403) return "Drive denied write permission for this file.";
  if (status === 404) return "The Drive file was deleted or moved.";
  if (status === 429) return "Drive rate limited the save; MarkDrive will retry after a short backoff.";
  return message;
}

function documentElement(): HTMLElement {
  return globalThis.document.documentElement;
}

function downloadBlob(name: string, type: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = globalThis.document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildSelfContainedHtml(name: string, markdown: string, codeHighlighter?: CodeHighlighter, highlightCss = ""): string {
  const frontmatter = readFrontmatter(markdown);
  const outline = extractOutline(markdown);
  const title = frontmatter.title || name.replace(/\.md$/i, "");
  const toc = outline.length > 0
    ? `<nav class="toc"><h2>Contents</h2>${outline.map((item) => `<a style="margin-left:${(item.level - 1) * 12}px" href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a>`).join("")}</nav>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;padding:48px;max-width:860px;font:18px/1.7 Lora,Georgia,serif;color:#111827;background:#fff}
h1,h2,h3,h4,h5,h6{font-family:Geist,Arial,sans-serif;line-height:1.2}
a{color:#0d9488}.toc{padding:16px 0;border-bottom:1px solid #d1d5db}.toc a{display:block}
pre{overflow:auto;padding:14px;border:1px solid #d1d5db;border-radius:8px;background:#111827;color:#f9fafb}
${highlightCss}
.frontmatter{margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #d1d5db;color:#4b5563}
@page{margin:0.75in;@bottom-center{content:counter(page)}}
</style>
</head>
<body>
<header class="frontmatter"><h1>${escapeHtml(title)}</h1>${frontmatter.date ? `<p>${escapeHtml(frontmatter.date)}</p>` : ""}${frontmatter.author ? `<p>${escapeHtml(frontmatter.author)}</p>` : ""}</header>
${toc}
<article>${renderMarkdown(markdown, codeHighlighter)}</article>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function nextTheme(theme: ThemeName): ThemeName {
  const themes: ThemeName[] = ["dark", "light", "dracula", "nord", "solarized"];
  return themes[(themes.indexOf(theme) + 1) % themes.length];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Image read failed")));
    reader.readAsDataURL(file);
  });
}

createRoot(globalThis.document.getElementById("root")!).render(<App />);
