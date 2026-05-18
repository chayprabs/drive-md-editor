import React, { useEffect, useState } from "react";
import { Check, FileText, Folder, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { sendMessage } from "../shared/messages";
import type { DriveFile, DriveFolder, FrontmatterFields, OpenDocument, OutlineItem } from "../shared/types";

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
  const [newName, setNewName] = useState("Untitled.md");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError(null);
      void Promise.all([
        sendMessage({ type: "drive:list-markdown", folderId: props.folderId, query: props.query }),
        sendMessage({ type: "drive:list-folders", folderId: props.folderId })
      ]).then(([fileResponse, folderResponse]) => {
        setBusy(false);
        if (fileResponse.ok && "files" in fileResponse) setFiles(fileResponse.files);
        else if (!fileResponse.ok) setError(fileResponse.message);
        if (folderResponse.ok && "folders" in folderResponse) setFolders(folderResponse.folders);
        else if (!folderResponse.ok) setError(folderResponse.message);
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

  return (
    <div className="panel">
      <h2>Drive</h2>
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
          <button className="folder-row" key={folder.id} onClick={() => props.onFolder(folder.id)}>
            <Folder size={14} />
            <span>{folder.name}</span>
          </button>
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
