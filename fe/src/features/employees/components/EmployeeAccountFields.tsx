import { SelectField } from "../../../shared/components/Controls";
import type { EmployeeFormState } from "../hooks/useEmployeeForm";

export function EmployeeAccountFields({ state }: { state: EmployeeFormState; }) {
  const { form, update } = state;

  return (
    <section className="panel panel-pad">
      <h2 className="form-section-title">Account access</h2>
      <label className="checkbox-line">
        <input
          type="checkbox"
          checked={form.createAccount}
          onChange={(event) => update("createAccount", event.target.checked)}
        />
        Create a login account now
      </label>
      {form.createAccount && (
        <SelectField
          label="Account role"
          value={form.accountRole}
          onChange={(event) => update("accountRole", event.target.value)}
          options={[
            { value: "EMPLOYEE", label: "Employee" },
            { value: "MANAGER", label: "Manager" },
            { value: "HR_ADMIN", label: "HR Admin" },
          ]}
        />
      )}
    </section>
  );
}
