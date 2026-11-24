import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "../../../shared/components/PageHeader";
import { PrimaryButton } from "../../../shared/components/Controls";
import { ErrorState, LoadingState } from "../../../shared/components/Feedback";
import { EmployeePersonalFields } from "../components/EmployeePersonalFields";
import { EmployeeEmploymentFields } from "../components/EmployeeEmploymentFields";
import { EmployeeAccountFields } from "../components/EmployeeAccountFields";
import { useEmployeeForm } from "../hooks/useEmployeeForm";

export function EmployeeFormPage() {
  const { employeeId } = useParams();
  const isEdit = Boolean(employeeId);
  const state = useEmployeeForm(employeeId);

  if (isEdit && state.employee.isLoading) return <LoadingState />;

  return (
    <div className="page-fade narrow-page">
      <Link
        className="back-link"
        to={isEdit ? `/app/employees/${employeeId}` : "/app/employees"}
      >
        <ArrowLeft size={16} />
        Back to employees
      </Link>
      <PageHeader
        eyebrow="PEOPLE / EMPLOYEES"
        title={isEdit ? "Edit employee" : "Add employee"}
        description="Keep your people records accurate and organized."
      />
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          state.mutation.mutate();
        }}
      >
        <EmployeePersonalFields state={state} isEdit={isEdit} />
        <EmployeeEmploymentFields state={state} isEdit={isEdit} employeeId={employeeId} />
        {!isEdit && <EmployeeAccountFields state={state} />}
        {state.mutation.error && <ErrorState error={state.mutation.error} />}
        <div className="form-actions">
          <Link to="/app/employees" className="btn btn-secondary">
            Cancel
          </Link>
          <PrimaryButton type="submit" disabled={state.mutation.isPending}>
            {state.mutation.isPending
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Create employee"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
