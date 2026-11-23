import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, Clock3, UsersRound } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";
import { api } from "../../../shared/api/client";
import { PageHeader } from "../../../shared/components/PageHeader";
import { Panel } from "../../../shared/components/Controls";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { LoadingState, ErrorState } from "../../../shared/components/Feedback";
import { readableDate } from "../../../shared/lib/format";

type Dashboard = {
  company: string;
  today: string;
  role: string;
  metrics: { label: string; value: number }[];
  attendance?: { status: string; record?: { clockInAt: string | null } | null };
  recentRequests?: {
    id: string;
    startDate: string;
    status: string;
    employee: { fullName: string };
    leaveType: { name: string };
  }[];
};
export function DashboardPage() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/dashboard") });
  const firstName = user?.fullName.split(" ")[0] ?? "there";
  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState error={query.error} />;
  const data = query.data;
  return (
    <div className="page-fade">
      <PageHeader
        eyebrow={`MONDAY TO FRIDAY · ${readableDate(data.today)}`}
        title={`Good to see you, ${firstName}.`}
        description={
          user?.role === "HR_ADMIN"
            ? "Here's what's happening across your people operations."
            : user?.role === "MANAGER"
              ? "A clear view of your team and what needs your attention."
              : "Your workday, attendance, and time off at a glance."
        }
      />
      <div className="dashboard-metrics">
        {data.metrics.map((metric, index) => (
          <div className="metric-cell" key={metric.label}>
            <span>{metric.label}</span>
            <div className="metric-main">
              <strong>{metric.value.toLocaleString()}</strong>
              <span className="metric-glyph">
                {index === 0 ? (
                  <UsersRound size={20} />
                ) : index % 2 === 0 ? (
                  <Clock3 size={20} />
                ) : (
                  <CalendarCheck size={20} />
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <Panel
          title={
            user?.role === "EMPLOYEE"
              ? "Today's attendance"
              : user?.role === "MANAGER"
                ? "Team workspace"
                : "Pending leave requests"
          }
          action={
            <Link
              className="text-link"
              to={
                user?.role === "EMPLOYEE"
                  ? "/app/me/attendance"
                  : user?.role === "MANAGER"
                    ? "/app/approvals"
                    : "/app/leave/requests"
              }
            >
              View all <ArrowRight size={15} />
            </Link>
          }
        >
          {user?.role === "EMPLOYEE" ? (
            <div className="attendance-overview">
              <div>
                <p className="muted-text">Workday status</p>
                <StatusBadge status={data.attendance?.status ?? "NOT_STARTED"} />
              </div>
              <Link to="/app/me/attendance" className="btn btn-primary">
                Open attendance
              </Link>
            </div>
          ) : data.recentRequests?.length ? (
            <div className="simple-list">
              {data.recentRequests.map((item) => (
                <Link to={`/app/approvals/${item.id}`} className="simple-list-item" key={item.id}>
                  <span className="avatar avatar-subtle">{item.employee.fullName.slice(0, 1)}</span>
                  <span className="simple-list-copy">
                    <strong>{item.employee.fullName}</strong>
                    <small>
                      {item.leaveType.name} · {readableDate(item.startDate)}
                    </small>
                  </span>
                  <StatusBadge status={item.status} />
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="dashboard-description">
              <p>Everything in one place.</p>
              <span>Visit the team or approval area to review updates.</span>
            </div>
          )}
        </Panel>
        <Panel title="Quick actions">
          <div className="quick-actions">
            {(user?.role === "HR_ADMIN"
              ? [
                  {
                    label: "Add an employee",
                    path: "/app/employees/new",
                    detail: "Create a people record",
                  },
                  {
                    label: "Review attendance",
                    path: "/app/attendance",
                    detail: "View today's activity",
                  },
                  {
                    label: "Manage organization",
                    path: "/app/organization/departments",
                    detail: "Departments and teams",
                  },
                ]
              : user?.role === "MANAGER"
                ? [
                    {
                      label: "Review approvals",
                      path: "/app/approvals",
                      detail: "Pending leave decisions",
                    },
                    {
                      label: "Browse my team",
                      path: "/app/team",
                      detail: "Direct reports and details",
                    },
                    {
                      label: "My attendance",
                      path: "/app/me/attendance",
                      detail: "Start or finish your workday",
                    },
                  ]
                : [
                    {
                      label: "Clock in or out",
                      path: "/app/me/attendance",
                      detail: "Record today's attendance",
                    },
                    {
                      label: "Request time off",
                      path: "/app/me/leave/new",
                      detail: "Submit a leave request",
                    },
                    {
                      label: "View my profile",
                      path: "/app/me/profile",
                      detail: "Personal employment details",
                    },
                  ]
            ).map((item) => (
              <Link className="quick-action" key={item.path} to={item.path}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
      <p className="dashboard-footer-note">
        Information reflects the latest available company records.
      </p>
    </div>
  );
}
