import { TextField, SelectField } from "../../../shared/components/Controls";
import type { EmployeeFormState } from "../hooks/useEmployeeForm";

type Props = { state: EmployeeFormState; isEdit: boolean; employeeId?: string | undefined; };

export function EmployeeEmploymentFields({ state, isEdit, employeeId }: Props) {
  const { form, update } = state;
  const departments = state.departments.data ?? [];
  const positions = state.positions.data ?? [];
  const managers = state.managers.data?.items ?? [];

  return (
    <section className="panel panel-pad">
      <h2 className="form-section-title">Employment details</h2>
      <div className="form-grid">
        <TextField
          label="Join date"
          type="date"
          required
          disabled={isEdit}
          value={form.joinDate}
          onChange={(event) => update("joinDate", event.target.value)}
        />
        <SelectField
          label="Department"
          required
          value={form.departmentId}
          onChange={(event) => update("departmentId", event.target.value)}
          options={[
            { value: "", label: "Select department" },
            ...departments
              .filter((department) => department.status === "ACTIVE")
              .map((department) => ({ value: department.id, label: department.name })),
          ]}
        />
        <SelectField
          label="Position"
          required
          value={form.positionId}
          onChange={(event) => update("positionId", event.target.value)}
          options={[
            { value: "", label: "Select position" },
            ...positions
              .filter((position) => position.status === "ACTIVE")
              .map((position) => ({ value: position.id, label: position.title })),
          ]}
        />
        <SelectField
          label="Direct manager"
          value={form.managerId}
          onChange={(event) => update("managerId", event.target.value)}
          options={[
            { value: "", label: "No manager" },
            ...managers
              .filter(
                (manager) =>
                  manager.id !== employeeId &&
                  manager.user &&
                  ["MANAGER", "HR_ADMIN"].includes(manager.user.role),
              )
              .map((manager) => ({ value: manager.id, label: manager.fullName })),
          ]}
        />
      </div>
    </section>
  );
}
