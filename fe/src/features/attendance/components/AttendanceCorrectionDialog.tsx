import { PrimaryButton, SecondaryButton } from "../../../shared/components/Controls";
import { ErrorState } from "../../../shared/components/Feedback";
import { Modal } from "../../../shared/components/Modal";
import type { AttendanceManagementState } from "../hooks/useAttendanceManagement";

type Props = { state: AttendanceManagementState; };

export function AttendanceCorrectionDialog({ state }: Props) {
  if (!state.selected) return null;

  return (
    <Modal
      title="Correct attendance"
      onClose={state.closeCorrection}
      footer={
        <>
          <SecondaryButton onClick={state.closeCorrection}>Cancel</SecondaryButton>
          <PrimaryButton
            disabled={
              state.correction.isPending ||
              state.reason.trim().length < 3 ||
              !state.employeeId ||
              !state.workDate
            }
            onClick={() => state.correction.mutate()}
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
            value={state.employeeId}
            onChange={(event) => state.setEmployeeId(event.target.value)}
          >
            <option value="">Select employee</option>
            {state.employees.data?.items.map((employee) => (
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
            value={state.workDate}
            onChange={(event) => state.setWorkDate(event.target.value)}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Clock in</span>
            <input
              className="input"
              type="datetime-local"
              value={state.clockInAt}
              onChange={(event) => state.setClockInAt(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Clock out</span>
            <input
              className="input"
              type="datetime-local"
              value={state.clockOutAt}
              onChange={(event) => state.setClockOutAt(event.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Reason</span>
          <textarea
            className="input"
            rows={3}
            value={state.reason}
            onChange={(event) => state.setReason(event.target.value)}
          />
        </label>
        {state.correction.error && <ErrorState error={state.correction.error} />}
      </div>
    </Modal>
  );
}
