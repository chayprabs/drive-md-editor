import React, { useCallback, useState } from "react";
import type { ToastMessage } from "../shared/types";

type ToastInput = Omit<ToastMessage, "id">;

export function useToasts(): {
  toasts: ToastMessage[];
  pushToast(toast: ToastInput): void;
  dismissToast(id: string): void;
} {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const pushToast = useCallback((toast: ToastInput) => {
    const next = { ...toast, id: crypto.randomUUID() };
    setToasts((current) => [...current, next]);
    window.setTimeout(() => dismissToast(next.id), 5000);
  }, [dismissToast]);
  return { toasts, pushToast, dismissToast };
}

export function Toasts({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss(id: string): void }): React.ReactElement {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          <div className="toast-body">
            <strong>{toast.title}</strong>
            {toast.detail ? <span>{toast.detail}</span> : null}
          </div>
          <button type="button" className="toast-dismiss" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
