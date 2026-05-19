import React from "react";
import { Clock3, FilePlus2, FolderOpen } from "lucide-react";
import type { RecentFile } from "../shared/types";

interface Props {
  recents: RecentFile[];
  onNewFile(): void;
  onBrowseDrive(): void;
  onOpenRecent(fileId: string): void;
}

export function EmptyState({ recents, onNewFile, onBrowseDrive, onOpenRecent }: Props): React.ReactElement {
  return (
    <section className="empty-state" aria-labelledby="empty-title">
      <div className="empty-hero">
        <img src="/icon.svg" alt="" />
        <p className="eyebrow">Your Markdown, native in Drive.</p>
        <h1 id="empty-title">MarkDrive</h1>
        <p className="empty-lead">
          Open a Drive markdown file, start a new document, or pick up where you left off from recents.
        </p>
        <div className="empty-actions">
          <button type="button" aria-label="New file" onClick={onNewFile}><FilePlus2 size={16} /> New File</button>
          <button type="button" aria-label="Browse Drive" onClick={onBrowseDrive}><FolderOpen size={16} /> Browse Drive</button>
        </div>
      </div>
      <div className="recent-panel">
        <h2><Clock3 size={16} /> Recents</h2>
        {recents.length === 0 ? (
          <p className="muted">Recently opened Drive markdown files will appear here.</p>
        ) : (
          recents.map((file) => (
            <button key={file.id} type="button" className="recent-row" onClick={() => onOpenRecent(file.id)}>
              <span>{file.name}</span>
              <time dateTime={file.openedAt}>{new Date(file.openedAt).toLocaleString()}</time>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
