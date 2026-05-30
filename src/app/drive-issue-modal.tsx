import React, { useEffect, useState } from "react";
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
  const [remainingMs, setRemainingMs] = useState(issue.kind === "rate-limit" ? issue.retryAfterMs : 0);
  const Icon = issue.kind === "auth" ? KeyRound : issue.kind === "deleted" ? Trash2 : AlertTriangle;
  const title = issue.kind === "auth"
    ? "Google Drive needs access"
    : issue.kind === "permission"
      ? "Drive denied permission"
      : issue.kind === "deleted"
        ? "This Drive file is unavailable"
        : "Drive is rate limiting saves";

  useEffect(() => {
    if (issue.kind !== "rate-limit") return;
    setRemainingMs(issue.retryAfterMs);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.max(0, issue.retryAfterMs - (Date.now() - startedAt));
      setRemainingMs(left);
      if (left === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [issue]);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal drive-issue" role="dialog" aria-modal="true" aria-labelledby="drive-issue-title">
        <div className="onboarding-icon"><Icon size={24} /></div>
        <h2 id="drive-issue-title">{title}</h2>
        <p>{issue.message}</p>
        {issue.kind === "rate-limit" ? (
          <p className="muted" aria-live="polite">
            {remainingMs > 0 ? `Retrying in ${Math.ceil(remainingMs / 1000)} seconds.` : "Retry is ready."}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
          {issue.kind === "auth" ? <button type="button" className="btn-primary" onClick={onReauth}>Re-authenticate</button> : null}
          {issue.kind !== "deleted" && issue.kind !== "auth" && issue.kind !== "permission" ? (
            <button type="button" className="btn-primary" onClick={onRetry} disabled={issue.kind === "rate-limit" && remainingMs > 0}>
              <RotateCcw size={14} /> Retry
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
