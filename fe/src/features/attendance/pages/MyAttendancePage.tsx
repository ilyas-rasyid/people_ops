import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, LogIn, LogOut } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { AttendanceRow, PageResult } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { Panel, PrimaryButton } from "../../../shared/components/Controls";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { ErrorState, LoadingState, EmptyState } from "../../../shared/components/Feedback";
import { readableDate, readableTime } from "../../../shared/lib/format";

export function MyAttendancePage() {
  const cache = useQueryClient();
  const today = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: () =>
      api<{
        date: string;
        status: string;
        record?: { clockInAt: string | null; clockOutAt: string | null; } | null;
      }>("/me/attendance/today"),
  });
  const history = useQuery({
    queryKey: ["attendance", "history"],
    queryFn: () => api<PageResult<AttendanceRow>>("/me/attendance?pageSize=14"),
  });
  const mutation = useMutation({
    mutationFn: (action: "in" | "out") =>
      api(`/me/attendance/clock-${action}`, { method: "POST", body: {}, idempotent: true }),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ["attendance"] }),
  });
  const state = today.data;
  const canIn = state?.status === "NOT_STARTED" || state?.status === "ABSENT";
  const canOut = state?.status === "INCOMPLETE" && !!state?.record?.clockInAt;
  return (
    <div className="page-fade">
      <PageHeader
        eyebrow="MY WORKSPACE / ATTENDANCE"
        title="My attendance"
        description="Record your workday and review your recent activity."
      />
      <div className="attendance-top-grid">
        <section className="panel panel-pad attendance-today">
          <div className="section-overline">
            <Clock3 size={17} /> TODAY'S WORKDAY
          </div>
          {today.isLoading ? (
            <LoadingState />
          ) : today.error ? (
            <ErrorState error={today.error} />
          ) : (
            <>
              <h2>{readableDate(state?.date)}</h2>
              <StatusBadge status={state?.status ?? "NOT_STARTED"} />
              <div className="clock-times">
                <div>
                  <span>Clock in</span>
                  <strong>{readableTime(state?.record?.clockInAt)}</strong>
                </div>
                <div>
                  <span>Clock out</span>
                  <strong>{readableTime(state?.record?.clockOutAt)}</strong>
                </div>
              </div>
              {canIn && (
                <PrimaryButton disabled={mutation.isPending} onClick={() => mutation.mutate("in")}>
                  <LogIn size={17} /> {mutation.isPending ? "Recording..." : "Clock in"}
                </PrimaryButton>
              )}
              {canOut && (
                <PrimaryButton disabled={mutation.isPending} onClick={() => mutation.mutate("out")}>
                  <LogOut size={17} /> {mutation.isPending ? "Recording..." : "Clock out"}
                </PrimaryButton>
              )}
              {!canIn && !canOut && (
                <p className="muted-text smaller">No attendance action is available right now.</p>
              )}
              {mutation.error && <ErrorState error={mutation.error} />}
            </>
          )}
        </section>
        <section className="panel panel-pad">
          <div className="section-overline">A BETTER WORKDAY</div>
          <h2 className="small-panel-heading">Your time, clearly recorded.</h2>
          <p className="muted-text">
            Clock-in and clock-out times are recorded by the server in the company timezone. Your
            attendance history stays available for review.
          </p>
          <div className="subtle-divider" />
          <p className="small-note">
            Need to correct an attendance record? Contact your HR administrator.
          </p>
        </section>
      </div>
      <Panel title="Recent attendance">
        {history.isLoading ? (
          <LoadingState />
        ) : history.error ? (
          <ErrorState error={history.error} />
        ) : !history.data?.items.length ? (
          <EmptyState />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work date</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.data.items.map((row) => (
                  <tr key={row.date}>
                    <td>{readableDate(row.date)}</td>
                    <td>{readableTime(row.record?.clockInAt)}</td>
                    <td>{readableTime(row.record?.clockOutAt)}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
