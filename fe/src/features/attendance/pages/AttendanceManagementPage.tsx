import { Plus } from "lucide-react";
import { PageHeader } from "../../../shared/components/PageHeader";
import { PrimaryButton } from "../../../shared/components/Controls";
import { ErrorState, EmptyState, LoadingState } from "../../../shared/components/Feedback";
import { AttendanceCorrectionDialog } from "../components/AttendanceCorrectionDialog";
import { AttendanceTable } from "../components/AttendanceTable";
import { useAttendanceManagement } from "../hooks/useAttendanceManagement";

export function AttendanceManagementPage({ team = false }: { team?: boolean; }) {
  const state = useAttendanceManagement(team);
  const query = state.records;

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
                state.openCorrection({
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
            value={state.status}
            onChange={(event) => state.changeStatus(event.target.value)}
          >
            {[
              "",
              "PRESENT",
              "LATE",
              "INCOMPLETE",
              "ABSENT",
              "ON_LEAVE",
              "NON_WORKING_DAY",
            ].map((status) => (
              <option value={status} key={status}>
                {status ? status.replaceAll("_", " ") : "All statuses"}
              </option>
            ))}
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
          <AttendanceTable
            rows={query.data.items}
            total={query.data.total}
            page={state.page}
            team={team}
            onPageChange={state.setPage}
            onCorrect={state.openCorrection}
          />
        )}
      </section>
      {!team && <AttendanceCorrectionDialog state={state} />}
    </div>
  );
}
