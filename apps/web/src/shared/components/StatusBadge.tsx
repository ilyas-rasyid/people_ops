const tone: Record<string, string> = {
  ACTIVE: "success",
  PRESENT: "success",
  APPROVED: "success",
  COMPLETED: "success",
  LATE: "warning",
  PENDING: "warning",
  INCOMPLETE: "warning",
  CLOCKED_IN: "info",
  REJECTED: "danger",
  ABSENT: "danger",
  INACTIVE: "neutral",
  CANCELLED: "neutral",
  HOLIDAY: "neutral",
  ON_LEAVE: "info",
  NON_WORKING_DAY: "neutral",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${tone[status] ?? "neutral"}`}>
      <span className="badge-dot" />
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
