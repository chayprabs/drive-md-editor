import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, FileText, Folder, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  defaultContentForKind,
  defaultFileNameForKind,
  fileKindFromName,
  mimeTypeForFileName,
  normalizeSupportedFileName,
  type MarkDriveFileKind
} from "../shared/file-types";
import { sendMessage } from "../shared/messages";
import type { DriveFile, DriveFolder, DriveFolderPathItem, FrontmatterFields, OpenDocument, OutlineItem } from "../shared/types";

const unexpectedDriveResponse = "Drive returned an unexpected response.";

interface Props {
  active: "outline" | "drive" | "frontmatter";
  outline: OutlineItem[];
  frontmatter: FrontmatterFields;
  query: string;
  folderId: string | null;
  activeFileId: string | null;
  onQuery(query: string): void;
  onFrontmatter(fields: FrontmatterFields): void;
  onOpenFile(fileId: string): void;
  onCreateDocument(document: OpenDocument): void;
  onFolder(folderId: string | null): void;
  onJump(line: number): void;
  onDriveFailure(status: number | undefined, message: string, retryAfterMs?: number): void;
}

export function Sidebar(props: Props): React.ReactElement {
  return (
    <aside className="sidebar">
      {props.active === "outline" && <Outline items={props.outline} onJump={props.onJump} />}
      {props.active === "drive" && <DriveBrowser {...props} />}
      {props.active === "frontmatter" && <FrontmatterPanel fields={props.frontmatter} onChange={props.onFrontmatter} />}
    </aside>
  );
}

function Outline({ items, onJump }: { items: OutlineItem[]; onJump(line: number): void }): React.ReactElement {
  return (
    <div className="panel">
      <h2>Outline</h2>
      {items.length === 0 ? <p className="muted">No headings yet.</p> : null}
      {items.map((item) => (
        <button key={`${item.line}-${item.id}`} className="outline-item" style={{ paddingLeft: item.level * 8 }} onClick={() => onJump(item.line)}>
          {item.text}
        </button>
      ))}
    </div>
  );
}

function reportDriveBrowserFailure(
  props: Props,
  status: number | undefined,
  message: string,
  retryAfterMs?: number
): void {
  if (status === 401 || status === 403 || status === 404 || status === 429) {
    props.onDriveFailure(status, message, retryAfterMs);
  }
}

function DriveBrowser(props: Props): React.ReactElement {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [path, setPath] = useState<DriveFolderPathItem[]>([{ id: null, name: "My Drive" }]);
  const [newFileKind, setNewFileKind] = useState<MarkDriveFileKind>("markdown");
  const [newName, setNewName] = useState("Untitled.md");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, DriveFolder[]>>({});
  const [expandingFolderId, setExpandingFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const loadRequestRef = useRef(0);
  const actionBusyRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requestId = loadRequestRef.current + 1;
      loadRequestRef.current = requestId;
      setBusy(true);
      setError(null);
      void Promise.all([
        sendMessage({ type: "drive:list-markdown", folderId: props.folderId, query: props.query }),
        sendMessage({ type: "drive:list-folders", folderId: props.folderId }),
        sendMessage({ type: "drive:get-folder-path", folderId: props.folderId })
      ]).then(([fileResponse, folderResponse, pathResponse]) => {
        if (requestId !== loadRequestRef.current) return;
        if (fileResponse.ok && "files" in fileResponse) setFiles(fileResponse.files);
        else {
          const message = fileResponse.ok ? unexpectedDriveResponse : fileResponse.message;
          setError(message);
          reportDriveBrowserFailure(props, fileResponse.ok ? undefined : fileResponse.status, message, fileResponse.ok ? undefined : fileResponse.retryAfterMs);
        }
        if (folderResponse.ok && "folders" in folderResponse) setFolders(folderResponse.folders);
        else {
          const message = folderResponse.ok ? unexpectedDriveResponse : folderResponse.message;
          setError(message);
          reportDriveBrowserFailure(props, folderResponse.ok ? undefined : folderResponse.status, message, folderResponse.ok ? undefined : folderResponse.retryAfterMs);
        }
        if (pathResponse.ok && "path" in pathResponse) setPath(pathResponse.path);
        else {
          const message = pathResponse.ok ? unexpectedDriveResponse : pathResponse.message;
          setError(message);
          reportDriveBrowserFailure(props, pathResponse.ok ? undefined : pathResponse.status, message, pathResponse.ok ? undefined : pathResponse.retryAfterMs);
        }
      }).catch((failure: unknown) => {
        if (requestId !== loadRequestRef.current) return;
        setError(failure instanceof Error ? failure.message : "Drive browser failed to load.");
      }).finally(() => {
        if (requestId === loadRequestRef.current) setBusy(false);
      });
    }, 150);
    return () => {
      window.clearTimeout(timer);
      loadRequestRef.current += 1;
    };
  }, [props.folderId, props.query]);

  async function createFile(): Promise<void> {
    if (!beginDriveAction()) return;
    const normalizedName = normalizeSupportedFileName(newName, newFileKind);
    const markdown = newFileKind === "markdown" ? "# Untitled\n" : defaultContentForKind(newFileKind);
    try {
      const response = await sendMessage({
        type: "drive:create-file",
        name: normalizedName,
        markdown,
        folderId: props.folderId
      });
      if (response.ok && "document" in response) {
        const created = response.document;
        props.onCreateDocument(created);
        const createdFileId = created.fileId;
        if (createdFileId) {
          setFiles((current) => [
            {
              id: createdFileId,
              name: created.name,
              mimeType: mimeTypeForFileName(created.name),
              modifiedTime: created.modifiedTime ?? new Date().toISOString(),
              parents: created.folderId ? [created.folderId] : undefined
            },
            ...current.filter((file) => file.id !== createdFileId)
          ]);
        }
        setNewName(defaultFileNameForKind(newFileKind));
        setError(null);
        return;
      }
      setError(response.ok ? unexpectedDriveResponse : response.message);
      if (!response.ok) reportDriveBrowserFailure(props, response.status, response.message, response.retryAfterMs);
    } catch (failure) {
      setError(describeUnknownError(failure));
    } finally {
      finishDriveAction();
    }
  }

  async function renameFile(fileId: string, name: string): Promise<void> {
    if (!beginDriveAction()) return;
    const kind = fileKindFromName(name) ?? "markdown";
    const normalizedName = normalizeSupportedFileName(name, kind);
    try {
      const response = await sendMessage({ type: "drive:rename-file", fileId, name: normalizedName });
      if (response.ok) {
        setFiles((current) => current.map((file) => file.id === fileId ? { ...file, name: normalizedName } : file));
        setRenaming(null);
        setError(null);
        return;
      }
      setError(response.message);
      reportDriveBrowserFailure(props, response.status, response.message, response.retryAfterMs);
    } catch (failure) {
      setError(describeUnknownError(failure));
    } finally {
      finishDriveAction();
    }
  }

  async function toggleFolder(folder: DriveFolder): Promise<void> {
    if (expandedFolders[folder.id]) {
      setExpandedFolders((current) => {
        const next = { ...current };
        delete next[folder.id];
        return next;
      });
      return;
    }

    if (!beginDriveAction()) return;
    setExpandingFolderId(folder.id);
    try {
      const response = await sendMessage({ type: "drive:list-folders", folderId: folder.id });
      if (response.ok && "folders" in response) {
        setExpandedFolders((current) => ({ ...current, [folder.id]: response.folders }));
        setError(null);
        return;
      }
      setError(response.ok ? unexpectedDriveResponse : response.message);
      if (!response.ok) reportDriveBrowserFailure(props, response.status, response.message, response.retryAfterMs);
    } catch (failure) {
      setError(describeUnknownError(failure));
    } finally {
      setExpandingFolderId(null);
      finishDriveAction();
    }
  }

  async function trashFile(fileId: string, fileName: string): Promise<void> {
    if (!window.confirm(`Move "${fileName}" to trash?`)) return;
    if (!beginDriveAction()) return;
    try {
      const response = await sendMessage({ type: "drive:trash-file", fileId });
      if (response.ok) {
        setFiles((current) => current.filter((item) => item.id !== fileId));
        setError(null);
        return;
      }
      setError(response.message);
      reportDriveBrowserFailure(props, response.status, response.message, response.retryAfterMs);
    } catch (failure) {
      setError(describeUnknownError(failure));
    } finally {
      finishDriveAction();
    }
  }

  function beginDriveAction(): boolean {
    if (actionBusyRef.current) return false;
    actionBusyRef.current = true;
    setActionBusy(true);
    return true;
  }

  function finishDriveAction(): void {
    actionBusyRef.current = false;
    setActionBusy(false);
  }

  return (
    <div className="panel">
      <h2>Drive</h2>
      <nav className="folder-path" aria-label="Drive folder path">
        {path.map((item, index) => (
          <React.Fragment key={`${item.id ?? "root"}-${index}`}>
            {index > 0 ? <ChevronRight size={12} /> : null}
            <button onClick={() => props.onFolder(item.id)}>{item.name}</button>
          </React.Fragment>
        ))}
      </nav>
      <div className="browser-actions">
        <select
          value={newFileKind}
          aria-label="New file type"
          disabled={actionBusy}
          onChange={(event) => {
            const kind = event.target.value as MarkDriveFileKind;
            setNewFileKind(kind);
            setNewName(defaultFileNameForKind(kind));
          }}
        >
          <option value="markdown">Markdown</option>
          <option value="text">Plain text</option>
          <option value="json">JSON</option>
        </select>
        <input value={newName} onChange={(event) => setNewName(event.target.value)} aria-label="New file name" disabled={actionBusy} />
        <button title="Create file" disabled={actionBusy} onClick={() => void createFile()}><Plus size={14} /></button>
      </div>
      <label className="searchbox">
        <Search size={14} />
        <input value={props.query} onChange={(event) => props.onQuery(event.target.value)} aria-label="Search supported files" />
      </label>
      <div className="folder-list">
        <button className="folder-row" disabled={actionBusy} onClick={() => props.onFolder(null)}>
          <Folder size={14} />
          <span>My Drive</span>
        </button>
        {folders.map((folder) => (
          <FolderTreeRow
            key={folder.id}
            folder={folder}
            childrenByFolder={expandedFolders}
            busyFolderId={expandingFolderId}
            disabled={actionBusy}
            level={0}
            onFolder={props.onFolder}
            onToggle={(target) => void toggleFolder(target)}
          />
        ))}
      </div>
      {error ? <p className="inline-error">{error}</p> : null}
      <div className="file-list" aria-busy={busy || actionBusy}>
        {!busy && files.length === 0 ? <p className="muted">No supported files in this folder.</p> : null}
        {files.map((file) => (
          <div className={`file-row${props.activeFileId === file.id ? " active" : ""}`} key={file.id}>
            {renaming?.id === file.id ? (
              <input
                className="rename-input"
                value={renaming.name}
                aria-label={`Rename ${file.name}`}
                onChange={(event) => setRenaming({ id: file.id, name: event.target.value })}
                disabled={actionBusy}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void renameFile(file.id, renaming.name);
                  if (event.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <button onClick={() => props.onOpenFile(file.id)} aria-current={props.activeFileId === file.id ? "true" : undefined}>
                <FileText size={14} />
                <span>{file.name}</span>
              </button>
            )}
            {renaming?.id === file.id ? (
              <button title="Confirm rename" disabled={actionBusy} onClick={() => void renameFile(file.id, renaming.name)}><Check size={14} /></button>
            ) : (
              <button title="Rename file" disabled={actionBusy} onClick={() => setRenaming({ id: file.id, name: file.name })}><Pencil size={14} /></button>
            )}
            {renaming?.id === file.id ? (
              <button title="Cancel rename" disabled={actionBusy} onClick={() => setRenaming(null)}><X size={14} /></button>
            ) : (
              <button title="Trash file" disabled={actionBusy} onClick={() => void trashFile(file.id, file.name)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FolderTreeRow({
  folder,
  childrenByFolder,
  busyFolderId,
  disabled,
  level,
  onFolder,
  onToggle
}: {
  folder: DriveFolder;
  childrenByFolder: Record<string, DriveFolder[]>;
  busyFolderId: string | null;
  disabled: boolean;
  level: number;
  onFolder(folderId: string): void;
  onToggle(folder: DriveFolder): void;
}): React.ReactElement {
  const expanded = Boolean(childrenByFolder[folder.id]);
  const childFolders = childrenByFolder[folder.id] ?? [];
  return (
    <div className="folder-tree-row">
      <div className="folder-row-shell" style={{ paddingLeft: level * 14 }}>
        <button className="folder-toggle" title={expanded ? "Collapse folder" : "Expand folder"} aria-expanded={expanded} disabled={disabled} onClick={() => onToggle(folder)}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <button className="folder-row" aria-busy={busyFolderId === folder.id} disabled={disabled} onClick={() => onFolder(folder.id)}>
          <Folder size={14} />
          <span>{folder.name}</span>
        </button>
      </div>
      {childFolders.map((child) => (
        <FolderTreeRow
          key={child.id}
          folder={child}
          childrenByFolder={childrenByFolder}
          busyFolderId={busyFolderId}
          disabled={disabled}
          level={level + 1}
          onFolder={onFolder}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function describeUnknownError(failure: unknown): string {
  return failure instanceof Error ? failure.message : "Drive browser request failed.";
}

function FrontmatterPanel({ fields, onChange }: { fields: FrontmatterFields; onChange(fields: FrontmatterFields): void }): React.ReactElement {
  return (
    <div className="panel form-panel">
      <h2>Frontmatter</h2>
      <label>Title<input value={fields.title} onChange={(event) => onChange({ ...fields, title: event.target.value })} /></label>
      <label>Date<input type="date" value={fields.date} onChange={(event) => onChange({ ...fields, date: event.target.value })} /></label>
      <label>Tags<input value={fields.tags.join(", ")} onChange={(event) => onChange({ ...fields, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label>
      <label>Author<input value={fields.author} onChange={(event) => onChange({ ...fields, author: event.target.value })} /></label>
      <label className="checkbox"><input type="checkbox" checked={fields.draft} onChange={(event) => onChange({ ...fields, draft: event.target.checked })} /> Draft</label>
    </div>
  );
}
