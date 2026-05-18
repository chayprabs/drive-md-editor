import React from "react";
import { AlertTriangle, KeyRound, RotateCcw, Trash2 } from "lucide-react";

export type DriveIssue =
  | { kind: "auth"; message: string }
  | { kind: "permission"; message: string }
  | { kind: "deleted"; message: string }
  | { kind: "rate-limit"; message: string; retryAfterMs: number };

interface Props {
  issue: DriveIssue;
  onClose(): void;
  onRetry(): void;
  onReauth(): void;
}

export function DriveIssueModal({ issue, onClose, onRetry, onReauth }: Props): React.ReactElement {
  const Icon = issue.kind === "auth" ? KeyRound : issue.kind === "deleted" ? Trash2 : AlertTriangle;
  const title = issue.kind === "auth"
    ? "Google Drive needs access"
    : issue.kind === "permission"
      ? "Drive denied permission"
      : issue.kind === "deleted"
        ? "This Drive file is unavailable"
        : "Drive is rate limiting saves";

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal drive-issue" role="dialog" aria-modal="true" aria-labelledby="drive-issue-title">
        <div className="onboarding-icon"><Icon size={24} /></div>
        <h2 id="drive-issue-title">{title}</h2>
        <p>{issue.message}</p>
        {issue.kind === "rate-limit" ? <p className="muted">Retrying in {Math.ceil(issue.retryAfterMs / 1000)} seconds.</p> : null}
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
          {issue.kind === "auth" ? <button onClick={onReauth}>Re-authenticate</button> : null}
          {issue.kind !== "deleted" ? <button onClick={onRetry}><RotateCcw size={14} /> Retry</button> : null}
        </div>
      </section>
    </div>
  );
}
