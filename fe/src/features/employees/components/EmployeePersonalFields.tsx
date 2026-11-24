import { TextField } from "../../../shared/components/Controls";
import type { EmployeeFormState } from "../hooks/useEmployeeForm";

type Props = { state: EmployeeFormState; isEdit: boolean; };

export function EmployeePersonalFields({ state, isEdit }: Props) {
  const { form, update } = state;

  return (
    <section className="panel panel-pad">
      <h2 className="form-section-title">Personal information</h2>
      <div className="form-grid">
        <TextField
          label="Full name"
          required
          value={form.fullName}
          onChange={(event) => update("fullName", event.target.value)}
        />
        <TextField
          label="Employee ID"
          required
          disabled={isEdit}
          value={form.employeeCode}
          onChange={(event) => update("employeeCode", event.target.value)}
        />
        <TextField
          label="Work email"
          type="email"
          required
          value={form.workEmail}
          onChange={(event) => update("workEmail", event.target.value)}
        />
        <TextField
          label="Phone number"
          value={form.phoneNumber}
          onChange={(event) => update("phoneNumber", event.target.value)}
        />
      </div>
    </section>
  );
}
