import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "../../../shared/components/PageHeader";
import { LoadingState, EmptyState, ErrorState } from "../../../shared/components/Feedback";
import { Pagination } from "../../../shared/components/Pagination";
import { EmployeeFilters } from "../components/EmployeeFilters";
import { EmployeeTable } from "../components/EmployeeTable";
import { EmployeeMobileList } from "../components/EmployeeMobileList";
import { useEmployeeDirectory } from "../hooks/useEmployeeDirectory";

export function EmployeeDirectoryPage({ team = false }: { team?: boolean; }) {
  const state = useEmployeeDirectory(team);
  const query = state.employees;

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
        <EmployeeFilters
          team={team}
          search={state.search}
          departmentId={state.departmentId}
          status={state.status}
          departments={state.departments.data ?? []}
          total={query.data?.total ?? 0}
          onSearch={state.changeSearch}
          onDepartment={state.changeDepartment}
          onStatus={state.changeStatus}
        />
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
            <EmployeeTable employees={query.data.items} team={team} />
            <EmployeeMobileList employees={query.data.items} team={team} />
            {!team && (
              <Pagination page={state.page} total={query.data.total} onChange={state.setPage} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
