import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Employee } from "../../../shared/types/domain";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { initials } from "../../../shared/lib/format";

type Props = { employees: Employee[]; team: boolean; };

export function EmployeeTable({ employees, team }: Props) {
  return (
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
          {employees.map((employee) => (
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
  );
}
