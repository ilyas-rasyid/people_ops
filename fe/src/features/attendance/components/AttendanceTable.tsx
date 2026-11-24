import { Pencil } from "lucide-react";
import { Pagination } from "../../../shared/components/Pagination";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import type { AttendanceRow } from "../../../shared/types/domain";
import { readableDate, readableTime } from "../../../shared/lib/format";

type Props = {
  rows: AttendanceRow[];
  total: number;
  page: number;
  team: boolean;
  onPageChange: (page: number) => void;
  onCorrect: (row: AttendanceRow) => void;
};

export function AttendanceTable({
  rows,
  total,
  page,
  team,
  onPageChange,
  onCorrect,
}: Props) {
  return (
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
            {rows.map((row) => (
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
                      type="button"
                      className="table-action"
                      onClick={() => onCorrect(row)}
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
      <Pagination page={page} total={total} onChange={onPageChange} />
    </>
  );
}
