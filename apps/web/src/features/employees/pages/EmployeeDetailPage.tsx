import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, UserX } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { Employee } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { PrimaryButton, SecondaryButton, Panel } from "../../../shared/components/Controls";
import { ErrorState, LoadingState } from "../../../shared/components/Feedback";
import { Modal } from "../../../shared/components/Modal";
import { initials, readableDate } from "../../../shared/lib/format";
import { AccountAccessPanel } from "../components/AccountAccessPanel";
import { EmployeeLeavePanel } from "../components/EmployeeLeavePanel";

export function EmployeeDetailPage({ team = false }: { team?: boolean }) {
  const { employeeId } = useParams();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [deactivate, setDeactivate] = useState(false);
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: [team ? "team-detail" : "employee", employeeId],
    queryFn: () => api<Employee>(team ? `/team/${employeeId}` : `/employees/${employeeId}`),
  });
  const history = useQuery({
    queryKey: ["employment-history", employeeId],
    enabled: !team && tab === "Employment",
    queryFn: () =>
      api<{ id: string; eventType: string; createdAt: string }[]>(
        `/employees/${employeeId}/employment-history`,
      ),
  });
  const mutation = useMutation({
    mutationFn: () =>
      api(`/employees/${employeeId}/deactivate`, {
        method: "POST",
        body: { reason },
        idempotent: true,
      }),
    onSuccess: async () => {
      setDeactivate(false);
      await cache.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState error={query.error} />;
  const employee = query.data;
  const tabs = team
    ? ["Overview", "Employment"]
    : ["Overview", "Employment", "Attendance", "Leave", "Account & Access"];
  return (
    <div className="page-fade">
      <Link className="back-link" to={team ? "/app/team" : "/app/employees"}>
        <ArrowLeft size={16} /> {team ? "My team" : "Employees"}
      </Link>
      <PageHeader
        eyebrow="PEOPLE / EMPLOYEE RECORD"
        title={employee.fullName}
        description={`${employee.employeeCode} · ${employee.position?.title ?? "Unassigned"}`}
        action={
          !team && (
            <div className="inline-actions">
              <Link className="btn btn-secondary" to={`/app/employees/${employee.id}/edit`}>
                <Pencil size={16} />
                Edit employee
              </Link>
              <SecondaryButton
                onClick={() => setDeactivate(true)}
                disabled={employee.status !== "ACTIVE"}
              >
                <UserX size={16} />
                Deactivate
              </SecondaryButton>
            </div>
          )
        }
      />
      <section className="employee-hero panel">
        <span className="avatar avatar-large">{initials(employee.fullName)}</span>
        <div>
          <h2>{employee.fullName}</h2>
          <p>{employee.workEmail}</p>
          <div className="hero-tags">
            <StatusBadge status={employee.status} />
            <span>{employee.department?.name}</span>
            <span>{employee.position?.title}</span>
          </div>
        </div>
      </section>
      <div className="tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? "tab-active" : ""}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <Panel>
        {tab === "Overview" ? (
          <div className="detail-grid">
            <Detail label="Employee ID" value={employee.employeeCode} />
            <Detail label="Full name" value={employee.fullName} />
            <Detail label="Work email" value={employee.workEmail} />
            <Detail label="Phone" value={employee.phoneNumber ?? "—"} />
            <Detail label="Join date" value={readableDate(employee.joinDate)} />
            <Detail label="Status" value={employee.status} />
          </div>
        ) : tab === "Employment" ? (
          <div className="panel-pad">
            <div className="detail-grid">
              <Detail label="Department" value={employee.department?.name} />
              <Detail label="Position" value={employee.position?.title} />
              <Detail
                label="Direct manager"
                value={employee.manager?.fullName ?? "No manager assigned"}
              />
              <Detail label="Join date" value={readableDate(employee.joinDate)} />
            </div>
            {!team && (
              <>
                <h3 className="subsection-title">Employment timeline</h3>
                <div className="simple-list">
                  {history.data?.map((event) => (
                    <div className="simple-list-item" key={event.id}>
                      <span className="history-dot" />
                      <span className="simple-list-copy">
                        <strong>{event.eventType.replaceAll("_", " ")}</strong>
                        <small>{readableDate(event.createdAt)}</small>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : tab === "Attendance" ? (
          <div className="panel-pad">
            <p className="muted-text">
              Attendance records are managed in the Attendance workspace.
            </p>
            <Link className="btn btn-secondary" to="/app/attendance">
              Open attendance
            </Link>
          </div>
        ) : tab === "Leave" ? (
          <EmployeeLeavePanel employee={employee} />
        ) : (
          <AccountAccessPanel employee={employee} />
        )}
      </Panel>
      {mutation.error && <ErrorState error={mutation.error} />}
      {deactivate && (
        <Modal
          title="Deactivate employee"
          onClose={() => setDeactivate(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setDeactivate(false)}>Keep active</SecondaryButton>
              <PrimaryButton
                disabled={reason.trim().length < 3 || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                Deactivate employee
              </PrimaryButton>
            </>
          }
        >
          <p>
            Deactivate {employee.fullName}? Their login sessions will be revoked and they will no
            longer be able to record attendance or request leave.
          </p>
          <label className="field">
            <span className="field-label">Reason (required)</span>
            <textarea
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {mutation.error && <ErrorState error={mutation.error} />}
        </Modal>
      )}
    </div>
  );
}
function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}
