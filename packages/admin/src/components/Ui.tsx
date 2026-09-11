import { AlertTriangle, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import type { TenantStatus } from "../data";

export function StatusBadge({
  status,
  label,
}: {
  status: TenantStatus | "healthy" | "degraded" | "unknown";
  label?: string;
}) {
  const copy = label ?? status.replaceAll("_", " ");
  return (
    <span className={`status ${status}`}>
      <i />
      {copy}
    </span>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <AlertTriangle size={16} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          <RotateCcw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}

export function LoadingRows({
  columns,
  label,
}: {
  columns: number;
  label: string;
}) {
  return (
    <tr className="loading-row">
      <td colSpan={columns}>
        <LoaderCircle className="spin" size={16} />
        {label}
      </td>
    </tr>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Modal({
  eyebrow,
  title,
  label,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-title">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
