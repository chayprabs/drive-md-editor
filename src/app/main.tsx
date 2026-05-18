import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bold,
  Braces,
  Check,
  Columns2,
  Download,
  Eye,
  FilePlus2,
  FolderOpen,
  Italic,
  Link,
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
import { EmptyState } from "./empty-state";
import { MarkdownEditor, type MarkdownEditorHandle } from "./markdown-editor";
import { Onboarding } from "./onboarding";
import { PreviewPane } from "./preview-pane";
import { Sidebar } from "./sidebar";
import { Toasts, useToasts } from "./toasts";
import { ConflictModal } from "./conflict-modal";
import { sendMessage } from "../shared/messages";
import { readFrontmatter, writeFrontmatter } from "../shared/frontmatter";
import { extractOutline, readingTimeMinutes } from "../shared/markdown";
import { loadRecents, rememberDocument, rememberDriveFile } from "../shared/recents";
import { defaultSettings, saveSettings } from "../shared/settings";
import type { MarkDriveSettings, OpenDocument, RecentFile, SaveConflict, ViewMode } from "../shared/types";
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
  const { toasts, pushToast, dismissToast } = useToasts();
  const editorRef = useRef<MarkdownEditorHandle | null>(null);
  const dirtyRef = useRef(false);

  const outline = useMemo(() => extractOutline(document.markdown), [document.markdown]);
  const frontmatter = useMemo(() => readFrontmatter(document.markdown), [document.markdown]);
  const stats = useMemo(() => {
    const words = document.markdown.trim().split(/\s+/).filter(Boolean).length;
    return {
      words,
      chars: document.markdown.length,
      reading: readingTimeMinutes(document.markdown)
    };
  }, [document.markdown]);

  useEffect(() => {
    void sendMessage({ type: "settings:get" }).then((response) => {
      if (response.ok && "settings" in response) {
        setSettings(response.settings);
        if (!response.settings.onboardingComplete || new URLSearchParams(location.search).get("onboarding") === "1") {
          setShowOnboarding(true);
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
    setRecents(await rememberDriveFile(response.file));
    setShowEmptyState(false);
    dirtyRef.current = false;
    setSaveState("idle");
  }, [pushToast]);

  const saveCurrent = useCallback(async (source: "manual" | "autosave" | "vim" = "manual") => {
    if (!navigator.onLine) {
      setSaveState("offline");
      await chrome.storage.local.set({ [`offline.${document.fileId ?? "new"}`]: document });
      pushToast({ tone: "warning", title: "Offline", detail: "Changes are queued locally and will retry when online." });
      return;
    }

    setSaveState("saving");
    const response = document.fileId
      ? await sendMessage({
          type: "drive:save-file",
          fileId: document.fileId,
          markdown: document.markdown,
          previousModifiedTime: document.modifiedTime
        })
      : await sendMessage({
          type: "drive:create-file",
          name: document.name,
          markdown: document.markdown,
          folderId: document.folderId
        });

    if (response.ok && "document" in response) {
      setDocument(response.document);
      setRecents(await rememberDocument(response.document));
      setShowEmptyState(false);
      dirtyRef.current = false;
      setSaveState("saved");
      if (source !== "autosave") pushToast({ tone: "success", title: "Saved to Drive" });
      return;
    }

    if (!response.ok && response.status === 409) {
      try {
        const drive = JSON.parse(response.message) as { markdown: string; modifiedTime: string };
        setConflict({ local: document, drive });
        setSaveState("error");
        return;
      } catch {
        setSaveState("error");
      }
    }

    setSaveState("error");
    if (!response.ok) pushToast({ tone: "danger", title: "Save failed", detail: describeDriveError(response.status, response.message) });
  }, [document, pushToast]);

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
    const html = `<!doctype html><meta charset="utf-8"><title>${document.name}</title><article>${document.markdown}</article>`;
    downloadBlob(`${document.name.replace(/\.md$/i, "")}.html`, "text/html", html);
  }, [document.markdown, document.name]);

  const exportMarkdown = useCallback(() => {
    downloadBlob(document.name, "text/markdown", document.markdown);
  }, [document.markdown, document.name]);

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
          <button title="Find and replace" onClick={() => editorRef.current?.openSearch()}><Search size={16} /></button>
        </div>
        <div className="toolbar-group">
          <button title="Split view" aria-pressed={viewMode === "split"} onClick={() => setViewMode("split")}><Columns2 size={16} /></button>
          <button title="Editor only" aria-pressed={viewMode === "editor"} onClick={() => setViewMode("editor")}><Braces size={16} /></button>
          <button title="Preview only" aria-pressed={viewMode === "preview"} onClick={() => setViewMode("preview")}><Eye size={16} /></button>
          <button title="Soft wrap" aria-pressed={settings.softWrap} onClick={() => void updateSettings({ softWrap: !settings.softWrap })}><WrapText size={16} /></button>
          <button title="Theme" onClick={() => void updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}>{settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        </div>
        <div className="toolbar-group overflow">
          <button title="Export Markdown" onClick={exportMarkdown}><Download size={16} /></button>
          <button title="Export HTML" onClick={exportHtml}><Upload size={16} /></button>
          <button title="Options" onClick={() => chrome.runtime.openOptionsPage()}><Settings size={16} /></button>
        </div>
      </header>

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
          folderId={document.folderId}
          onQuery={setQuery}
          onFrontmatter={updateFrontmatter}
          onOpenFile={(fileId) => void openFile(fileId)}
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
                onSmartHtmlPaste={importPaste}
                onImageFiles={(files) => void uploadImages(files)}
              />
            )}
            {viewMode !== "editor" && <PreviewPane markdown={document.markdown} onChange={changeMarkdown} />}
          </div>
        )}
      </section>

      <footer className="statusbar">
        <span>{document.name}</span>
        <span>{stats.words} words</span>
        <span>{stats.chars} chars</span>
        <span>{stats.reading} min read</span>
        <span className={`save-state ${saveState}`}>{saveState}</span>
      </footer>
      {conflict && (
        <ConflictModal
          conflict={conflict}
          onKeepMine={() => {
            setDocument({ ...conflict.local, modifiedTime: conflict.drive.modifiedTime });
            setConflict(null);
            void saveCurrent("manual");
          }}
          onKeepDrive={() => {
            setDocument({ ...conflict.local, markdown: conflict.drive.markdown, modifiedTime: conflict.drive.modifiedTime });
            dirtyRef.current = false;
            setConflict(null);
          }}
          onSaveCopy={() => {
            setDocument({ ...conflict.local, fileId: null, name: conflict.local.name.replace(/\.md$/i, " copy.md") });
            setConflict(null);
            void saveCurrent("manual");
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Image read failed")));
    reader.readAsDataURL(file);
  });
}

createRoot(globalThis.document.getElementById("root")!).render(<App />);
