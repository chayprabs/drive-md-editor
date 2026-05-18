import React, { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, FileText, Folder, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { sendMessage } from "../shared/messages";
import type { DriveFile, DriveFolder, DriveFolderPathItem, FrontmatterFields, OpenDocument, OutlineItem } from "../shared/types";

interface Props {
  active: "outline" | "drive" | "frontmatter";
  outline: OutlineItem[];
  frontmatter: FrontmatterFields;
  query: string;
  folderId: string | null;
  onQuery(query: string): void;
  onFrontmatter(fields: FrontmatterFields): void;
  onOpenFile(fileId: string): void;
  onCreateDocument(document: OpenDocument): void;
  onFolder(folderId: string | null): void;
  onJump(line: number): void;
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

function DriveBrowser(props: Props): React.ReactElement {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [path, setPath] = useState<DriveFolderPathItem[]>([{ id: null, name: "My Drive" }]);
  const [newName, setNewName] = useState("Untitled.md");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, DriveFolder[]>>({});
  const [expandingFolderId, setExpandingFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError(null);
      void Promise.all([
        sendMessage({ type: "drive:list-markdown", folderId: props.folderId, query: props.query }),
        sendMessage({ type: "drive:list-folders", folderId: props.folderId }),
        sendMessage({ type: "drive:get-folder-path", folderId: props.folderId })
      ]).then(([fileResponse, folderResponse, pathResponse]) => {
        setBusy(false);
        if (fileResponse.ok && "files" in fileResponse) setFiles(fileResponse.files);
        else if (!fileResponse.ok) setError(fileResponse.message);
        if (folderResponse.ok && "folders" in folderResponse) setFolders(folderResponse.folders);
        else if (!folderResponse.ok) setError(folderResponse.message);
        if (pathResponse.ok && "path" in pathResponse) setPath(pathResponse.path);
        else if (!pathResponse.ok) setError(pathResponse.message);
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [props.folderId, props.query]);

  async function createFile(): Promise<void> {
    const response = await sendMessage({
      type: "drive:create-file",
      name: newName,
      markdown: "# Untitled\n",
      folderId: props.folderId
    });
    if (response.ok && "document" in response) {
      props.onCreateDocument(response.document);
      setNewName("Untitled.md");
      return;
    }
    if (!response.ok) setError(response.message);
  }

  async function renameFile(fileId: string, name: string): Promise<void> {
    const response = await sendMessage({ type: "drive:rename-file", fileId, name });
    if (response.ok) {
      setFiles((current) => current.map((file) => file.id === fileId ? { ...file, name: name.endsWith(".md") ? name : `${name}.md` } : file));
      setRenaming(null);
      return;
    }
    setError(response.message);
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

    setExpandingFolderId(folder.id);
    const response = await sendMessage({ type: "drive:list-folders", folderId: folder.id });
    setExpandingFolderId(null);
    if (response.ok && "folders" in response) {
      setExpandedFolders((current) => ({ ...current, [folder.id]: response.folders }));
      return;
    }
    if (!response.ok) setError(response.message);
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
        <input value={newName} onChange={(event) => setNewName(event.target.value)} aria-label="New markdown file name" />
        <button title="Create markdown file" onClick={() => void createFile()}><Plus size={14} /></button>
      </div>
      <label className="searchbox">
        <Search size={14} />
        <input value={props.query} onChange={(event) => props.onQuery(event.target.value)} aria-label="Search .md files" />
      </label>
      <div className="folder-list">
        <button className="folder-row" onClick={() => props.onFolder(null)}>
          <Folder size={14} />
          <span>My Drive</span>
        </button>
        {folders.map((folder) => (
          <FolderTreeRow
            key={folder.id}
            folder={folder}
            childrenByFolder={expandedFolders}
            busyFolderId={expandingFolderId}
            level={0}
            onFolder={props.onFolder}
            onToggle={(target) => void toggleFolder(target)}
          />
        ))}
      </div>
      {error ? <p className="inline-error">{error}</p> : null}
      <div className="file-list" aria-busy={busy}>
        {files.map((file) => (
          <div className="file-row" key={file.id}>
            {renaming?.id === file.id ? (
              <input
                className="rename-input"
                value={renaming.name}
                aria-label={`Rename ${file.name}`}
                onChange={(event) => setRenaming({ id: file.id, name: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void renameFile(file.id, renaming.name);
                  if (event.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <button onClick={() => props.onOpenFile(file.id)}>
                <FileText size={14} />
                <span>{file.name}</span>
              </button>
            )}
            {renaming?.id === file.id ? (
              <button title="Confirm rename" onClick={() => void renameFile(file.id, renaming.name)}><Check size={14} /></button>
            ) : (
              <button title="Rename file" onClick={() => setRenaming({ id: file.id, name: file.name })}><Pencil size={14} /></button>
            )}
            {renaming?.id === file.id ? (
              <button title="Cancel rename" onClick={() => setRenaming(null)}><X size={14} /></button>
            ) : (
              <button title="Trash file" onClick={() => void sendMessage({ type: "drive:trash-file", fileId: file.id }).then((response) => {
                if (response.ok) setFiles((current) => current.filter((item) => item.id !== file.id));
                else setError(response.message);
              })}>
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
  level,
  onFolder,
  onToggle
}: {
  folder: DriveFolder;
  childrenByFolder: Record<string, DriveFolder[]>;
  busyFolderId: string | null;
  level: number;
  onFolder(folderId: string): void;
  onToggle(folder: DriveFolder): void;
}): React.ReactElement {
  const expanded = Boolean(childrenByFolder[folder.id]);
  const childFolders = childrenByFolder[folder.id] ?? [];
  return (
    <div className="folder-tree-row">
      <div className="folder-row-shell" style={{ paddingLeft: level * 14 }}>
        <button className="folder-toggle" title={expanded ? "Collapse folder" : "Expand folder"} aria-expanded={expanded} onClick={() => onToggle(folder)}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <button className="folder-row" aria-busy={busyFolderId === folder.id} onClick={() => onFolder(folder.id)}>
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
          level={level + 1}
          onFolder={onFolder}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
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
