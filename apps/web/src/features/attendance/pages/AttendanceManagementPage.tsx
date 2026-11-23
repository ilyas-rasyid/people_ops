import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { AttendanceRow, Employee, PageResult } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { SearchInput, PrimaryButton, SecondaryButton } from "../../../shared/components/Controls";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { ErrorState, EmptyState, LoadingState } from "../../../shared/components/Feedback";
import { Modal } from "../../../shared/components/Modal";
import { Pagination } from "../../../shared/components/Pagination";
import { readableDate, readableTime } from "../../../shared/lib/format";

export function AttendanceManagementPage({ team = false }: { team?: boolean }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AttendanceRow | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [clockInAt, setClockInAt] = useState("");
  const [clockOutAt, setClockOutAt] = useState("");
  const [reason, setReason] = useState("");
  const cache = useQueryClient();
  const path = team ? "/team/attendance" : "/attendance";
  const query = useQuery({
    queryKey: [path, status, page],
    queryFn: () =>
      api<PageResult<AttendanceRow>>(
        `${path}?${new URLSearchParams({ status, page: String(page), pageSize: "20" })}`,
      ),
  });
  const employees = useQuery({
    queryKey: ["employees", "attendance-picker"],
    enabled: !team,
    queryFn: () => api<PageResult<Employee>>("/employees?pageSize=100"),
  });
  const correction = useMutation({
    mutationFn: () =>
      api("/attendance/corrections", {
        method: "POST",
        idempotent: true,
        body: {
          employeeId,
          workDate,
          clockInAt: clockInAt ? new Date(clockInAt).toISOString() : null,
          clockOutAt: clockOutAt ? new Date(clockOutAt).toISOString() : null,
          reason,
          ...(selected?.record ? { expectedVersion: selected.record.version } : {}),
        },
      }),
    onSuccess: () => {
      setSelected(null);
      setEmployeeId("");
      setReason("");
      void cache.invalidateQueries({ queryKey: [path] });
    },
  });
  const open = (row: AttendanceRow | null) => {
    setSelected(row);
    setEmployeeId(row?.employee.id ?? "");
    setWorkDate(row?.date ?? "");
    setClockInAt(row?.record?.clockInAt ? row.record.clockInAt.slice(0, 16) : "");
    setClockOutAt(row?.record?.clockOutAt ? row.record.clockOutAt.slice(0, 16) : "");
    setReason("");
  };
  return (
    <div className="page-fade">
      <PageHeader
        eyebrow={team ? "MY TEAM" : "PEOPLE OPERATIONS"}
        title={team ? "Team attendance" : "Attendance management"}
        description="Review working-day attendance and follow up on exceptions."
        action={
          !team && (
            <PrimaryButton
              onClick={() =>
                open({
                  date: "",
                  status: "NOT_STARTED",
                  employee: { id: "", fullName: "", employeeCode: "" },
                  record: null,
                })
              }
            >
              <Plus size={17} />
              New correction
            </PrimaryButton>
          )
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <select
            className="input filter-select"
            aria-label="Attendance status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {["", "PRESENT", "LATE", "INCOMPLETE", "ABSENT", "ON_LEAVE", "NON_WORKING_DAY"].map(
              (s) => (
                <option value={s} key={s}>
                  {s ? s.replaceAll("_", " ") : "All statuses"}
                </option>
              ),
            )}
          </select>
          <span className="table-toolbar-count">{query.data?.total ?? 0} records</span>
        </div>
        {query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : !query.data?.items.length ? (
          <EmptyState />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Work date</th>
                    <th>Clock in</th>
                    <th>Clock out</th>
                    <th>Status</th>
                    {!team && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((row) => (
                    <tr key={`${row.employee.id}:${row.date}`}>
                      <td>
                        <strong>{row.employee.fullName}</strong>
                        <small className="block-muted">{row.employee.employeeCode}</small>
                      </td>
                      <td>{readableDate(row.date)}</td>
                      <td>{readableTime(row.record?.clockInAt)}</td>
                      <td>{readableTime(row.record?.clockOutAt)}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      {!team && (
                        <td>
                          <button
                            className="table-action"
                            onClick={() => open(row)}
                            aria-label={`Correct ${row.employee.fullName} on ${row.date}`}
                          >
                            <Pencil size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={query.data.total} onChange={setPage} />
          </>
        )}
      </section>
      {!team && selected && (
        <Modal
          title="Correct attendance"
          onClose={() => setSelected(null)}
          footer={
            <>
              <SecondaryButton onClick={() => setSelected(null)}>Cancel</SecondaryButton>
              <PrimaryButton
                disabled={
                  correction.isPending || reason.trim().length < 3 || !employeeId || !workDate
                }
                onClick={() => correction.mutate()}
              >
                Save correction
              </PrimaryButton>
            </>
          }
        >
          <div className="form-stack">
            <label className="field">
              <span className="field-label">Employee</span>
              <select
                className="input"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Select employee</option>
                {employees.data?.items.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Work date</span>
              <input
                className="input"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Clock in</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={clockInAt}
                  onChange={(e) => setClockInAt(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Clock out</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={clockOutAt}
                  onChange={(e) => setClockOutAt(e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Reason</span>
              <textarea
                className="input"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {correction.error && <ErrorState error={correction.error} />}
          </div>
        </Modal>
      )}
    </div>
  );
}
