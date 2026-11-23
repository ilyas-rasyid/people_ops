import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Plus } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { Department, Employee, PageResult } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { PrimaryButton, SearchInput } from "../../../shared/components/Controls";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "../../../shared/components/Feedback";
import { Pagination } from "../../../shared/components/Pagination";
import { initials } from "../../../shared/lib/format";

export function EmployeeDirectoryPage({ team = false }: { team?: boolean }) {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => api<Department[]>("/departments"),
    enabled: !team,
  });
  const query = useQuery({
    queryKey: [team ? "team" : "employees", search, departmentId, status, page],
    queryFn: () =>
      team
        ? api<Employee[]>("/team").then((items) => ({
            items: items.filter((item) =>
              item.fullName.toLowerCase().includes(search.toLowerCase()),
            ),
            total: items.length,
            page: 1,
            pageSize: 100,
          }))
        : api<PageResult<Employee>>(
            `/employees?${new URLSearchParams({
              search,
              departmentId,
              status,
              page: String(page),
              pageSize: "20",
            })}`,
          ),
  });
  return (
    <div className="page-fade">
      <PageHeader
        eyebrow={team ? "TEAM" : "PEOPLE / DIRECTORY"}
        title={team ? "My team" : "Employees"}
        description={
          team
            ? "Your direct reports, all in one place."
            : "Manage employee information, teams, and employment status."
        }
        action={
          !team && (
            <Link to="/app/employees/new" className="btn btn-primary">
              <Plus size={17} />
              Add employee
            </Link>
          )
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search name, employee ID, or email"
          />
          {!team && (
            <>
              <select
                className="input filter-select"
                aria-label="Department filter"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All departments</option>
                {departments.data?.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </select>
              <select
                className="input filter-select"
                aria-label="Employment status filter"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </>
          )}
          <span className="table-toolbar-count">{query.data?.total ?? 0} employees</span>
        </div>
        {query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : !query.data?.items.length ? (
          <EmptyState
            title="No employees found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Status</th>
                    <th className="th-actions">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div className="person-cell">
                          <span className="avatar avatar-soft">{initials(employee.fullName)}</span>
                          <span>
                            <strong>{employee.fullName}</strong>
                            <small>{employee.workEmail}</small>
                          </span>
                        </div>
                      </td>
                      <td className="mono-value">{employee.employeeCode}</td>
                      <td>{employee.department?.name ?? "—"}</td>
                      <td>{employee.position?.title ?? "—"}</td>
                      <td>
                        <StatusBadge status={employee.status} />
                      </td>
                      <td className="th-actions">
                        <Link
                          className="table-action"
                          aria-label={`View ${employee.fullName}`}
                          to={team ? `/app/team/${employee.id}` : `/app/employees/${employee.id}`}
                        >
                          <ArrowUpRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="employee-mobile-list">
              {query.data.items.map((employee) => (
                <Link
                  to={team ? `/app/team/${employee.id}` : `/app/employees/${employee.id}`}
                  className="employee-mobile-card"
                  key={employee.id}
                >
                  <span className="avatar avatar-soft">{initials(employee.fullName)}</span>
                  <span>
                    <strong>{employee.fullName}</strong>
                    <small>
                      {employee.employeeCode} ·{employee.department?.name ?? "Unassigned"}
                    </small>
                  </span>
                  <StatusBadge status={employee.status} />
                </Link>
              ))}
            </div>
            {!team && <Pagination page={page} total={query.data.total} onChange={setPage} />}
          </>
        )}
      </section>
    </div>
  );
}
