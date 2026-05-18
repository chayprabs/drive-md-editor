import React, { useEffect, useState } from "react";
import { FileText, Search, Trash2 } from "lucide-react";
import { sendMessage } from "../shared/messages";
import type { DriveFile, FrontmatterFields, OutlineItem } from "../shared/types";

interface Props {
  active: "outline" | "drive" | "frontmatter";
  outline: OutlineItem[];
  frontmatter: FrontmatterFields;
  query: string;
  folderId: string | null;
  onQuery(query: string): void;
  onFrontmatter(fields: FrontmatterFields): void;
  onOpenFile(fileId: string): void;
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusy(true);
      void sendMessage({ type: "drive:list-markdown", folderId: props.folderId, query: props.query }).then((response) => {
        setBusy(false);
        if (response.ok && "files" in response) setFiles(response.files);
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [props.folderId, props.query]);

  return (
    <div className="panel">
      <h2>Drive</h2>
      <label className="searchbox">
        <Search size={14} />
        <input value={props.query} onChange={(event) => props.onQuery(event.target.value)} aria-label="Search .md files" />
      </label>
      <div className="file-list" aria-busy={busy}>
        {files.map((file) => (
          <div className="file-row" key={file.id}>
            <button onClick={() => props.onOpenFile(file.id)}>
              <FileText size={14} />
              <span>{file.name}</span>
            </button>
            <button title="Trash file" onClick={() => void sendMessage({ type: "drive:trash-file", fileId: file.id }).then(() => setFiles((current) => current.filter((item) => item.id !== file.id)))}>
              <Trash2 size={14} />
            </button>
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
