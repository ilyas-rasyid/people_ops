import { Link } from "react-router-dom";
import type { Employee } from "../../../shared/types/domain";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { initials } from "../../../shared/lib/format";

type Props = { employees: Employee[]; team: boolean; };

export function EmployeeMobileList({ employees, team }: Props) {
  return (
    <div className="employee-mobile-list">
      {employees.map((employee) => (
        <Link
          key={employee.id}
          to={team ? `/app/team/${employee.id}` : `/app/employees/${employee.id}`}
          className="employee-mobile-card"
        >
          <span className="avatar avatar-soft">{initials(employee.fullName)}</span>
          <span>
            <strong>{employee.fullName}</strong>
            <small>
              {employee.employeeCode} · {employee.department?.name ?? "Unassigned"}
            </small>
          </span>
          <StatusBadge status={employee.status} />
        </Link>
      ))}
    </div>
  );
}
