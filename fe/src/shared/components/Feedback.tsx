import { AlertCircle, CircleHelp, LoaderCircle } from "lucide-react";
import { ApiError } from "../api/client";

export function LoadingState({ label = "Loading data..." }: { label?: string; }) {
  return (
    <div className="state-message">
      <LoaderCircle className="spin" size={20} />
      {label}
    </div>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  description = "No records match this view.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <CircleHelp size={26} strokeWidth={1.5} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
export function ErrorState({ error }: { error: unknown; }) {
  const message =
    error instanceof ApiError || error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={18} />
      {message}
    </div>
  );
}
