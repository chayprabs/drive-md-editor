import React from "react";
import type { SaveConflict } from "../shared/types";

interface Props {
  conflict: SaveConflict;
  onKeepMine(): void;
  onKeepDrive(): void;
  onSaveCopy(): void;
}

export function ConflictModal({ conflict, onKeepMine, onKeepDrive, onSaveCopy }: Props): React.ReactElement {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <h2 id="conflict-title">Drive changed this file</h2>
        <p>
          MarkDrive found a newer Drive version modified at {new Date(conflict.drive.modifiedTime).toLocaleString()}.
        </p>
        <div className="modal-actions">
          <button onClick={onKeepMine}>Keep Mine</button>
          <button onClick={onKeepDrive}>Keep Drive</button>
          <button onClick={onSaveCopy}>Save as Copy</button>
        </div>
      </section>
    </div>
  );
}
