import React, { useMemo } from "react";
import type { SaveConflict } from "../shared/types";

interface Props {
  conflict: SaveConflict;
  onKeepMine(): void;
  onKeepDrive(): void;
  onSaveCopy(): void;
}

export function ConflictModal({ conflict, onKeepMine, onKeepDrive, onSaveCopy }: Props): React.ReactElement {
  const summary = useMemo(() => summarizeConflict(conflict.local.markdown, conflict.drive.markdown), [conflict]);
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal conflict-modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <h2 id="conflict-title">Drive changed this file</h2>
        <p>
          MarkDrive found a newer Drive version modified at {new Date(conflict.drive.modifiedTime).toLocaleString()}.
        </p>
        <p className="conflict-guidance">
          Choose carefully: <strong>Keep Mine</strong> overwrites Drive with your draft, <strong>Keep Drive</strong> discards local edits,
          and <strong>Save as Copy</strong> writes your draft to a new file.
        </p>
        <div className="conflict-stats" aria-label="Conflict summary">
          <span>{summary.changedLines} changed lines</span>
          <span>{summary.localWords} local words</span>
          <span>{summary.driveWords} Drive words</span>
        </div>
        <div className="conflict-grid">
          <section>
            <h3>Local Draft</h3>
            <pre>{summary.localPreview}</pre>
          </section>
          <section>
            <h3>Drive Version</h3>
            <pre>{summary.drivePreview}</pre>
          </section>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onKeepMine}>Keep Mine</button>
          <button type="button" onClick={onKeepDrive}>Keep Drive</button>
          <button type="button" onClick={onSaveCopy}>Save as Copy</button>
        </div>
      </section>
    </div>
  );
}

function summarizeConflict(local: string, drive: string): {
  changedLines: number;
  localWords: number;
  driveWords: number;
  localPreview: string;
  drivePreview: string;
} {
  const localLines = local.split(/\r?\n/);
  const driveLines = drive.split(/\r?\n/);
  const maxLines = Math.max(localLines.length, driveLines.length);
  let changedLines = 0;
  for (let index = 0; index < maxLines; index += 1) {
    if ((localLines[index] ?? "") !== (driveLines[index] ?? "")) changedLines += 1;
  }
  return {
    changedLines,
    localWords: countWords(local),
    driveWords: countWords(drive),
    localPreview: previewLines(localLines),
    drivePreview: previewLines(driveLines)
  };
}

function previewLines(lines: string[]): string {
  const limit = 120;
  const preview = lines.slice(0, limit).map((line, index) => `${String(index + 1).padStart(3, " ")}  ${line}`).join("\n");
  return lines.length > limit ? `${preview}\n... ${lines.length - limit} more lines` : preview;
}

function countWords(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}
