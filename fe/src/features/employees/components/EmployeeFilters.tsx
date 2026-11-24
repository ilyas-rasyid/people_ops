import { SearchInput } from "../../../shared/components/Controls";
import type { Department } from "../../../shared/types/domain";

type Props = {
  team: boolean;
  search: string;
  departmentId: string;
  status: string;
  departments: Department[];
  total: number;
  onSearch: (value: string) => void;
  onDepartment: (value: string) => void;
  onStatus: (value: string) => void;
};

export function EmployeeFilters({
  team,
  search,
  departmentId,
  status,
  departments,
  total,
  onSearch,
  onDepartment,
  onStatus,
}: Props) {
  return (
    <div className="table-toolbar">
      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder="Search name, employee ID, or email"
      />
      {!team && (
        <>
          <select
            className="input filter-select"
            aria-label="Department filter"
            value={departmentId}
            onChange={(event) => onDepartment(event.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            className="input filter-select"
            aria-label="Employment status filter"
            value={status}
            onChange={(event) => onStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </>
      )}
      <span className="table-toolbar-count">{total} employees</span>
    </div>
  );
}
