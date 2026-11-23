import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { Employee, Department, Position } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import {
  PrimaryButton,
  SecondaryButton,
  TextField,
  SelectField,
} from "../../../shared/components/Controls";
import { ErrorState, LoadingState } from "../../../shared/components/Feedback";

export function EmployeeFormPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    employeeCode: "",
    workEmail: "",
    phoneNumber: "",
    joinDate: "",
    departmentId: "",
    positionId: "",
    managerId: "",
    accountRole: "EMPLOYEE",
    createAccount: false,
  });
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => api<Department[]>("/departments"),
  });
  const positions = useQuery({
    queryKey: ["positions"],
    queryFn: () => api<Position[]>("/positions"),
  });
  const managers = useQuery({
    queryKey: ["manager-options"],
    queryFn: () => api<{ items: Employee[] }>("/employees?pageSize=100"),
  });
  const employee = useQuery({
    queryKey: ["employee", employeeId],
    enabled: !!employeeId,
    queryFn: () => api<Employee>(`/employees/${employeeId}`),
  });
  useEffect(() => {
    if (!employee.data) return;
    const e = employee.data;
    setForm({
      fullName: e.fullName,
      employeeCode: e.employeeCode,
      workEmail: e.workEmail,
      phoneNumber: e.phoneNumber ?? "",
      joinDate: e.joinDate.slice(0, 10),
      departmentId: e.departmentId,
      positionId: e.positionId,
      managerId: e.managerId ?? "",
      createAccount: false,
      accountRole: "EMPLOYEE",
    });
  }, [employee.data]);
  const mutation = useMutation({
    mutationFn: () =>
      employeeId
        ? api<Employee>(`/employees/${employeeId}`, {
            method: "PATCH",
            body: {
              fullName: form.fullName,
              workEmail: form.workEmail,
              phoneNumber: form.phoneNumber || null,
              departmentId: form.departmentId,
              positionId: form.positionId,
              managerId: form.managerId || null,
              expectedVersion: employee.data!.version,
            },
          })
        : api<Employee & { temporaryPassword?: string }>("/employees", {
            method: "POST",
            idempotent: true,
            body: {
              ...form,
              phoneNumber: form.phoneNumber || null,
              managerId: form.managerId || null,
              accountRole: form.accountRole,
            },
          }),
    onSuccess: (result) => {
      if ("temporaryPassword" in result && result.temporaryPassword) {
        window.alert(
          `One-time temporary password: ${result.temporaryPassword}\nCopy it now; it will not be shown again.`,
        );
      }
      navigate(`/app/employees/${result.id}`);
    },
  });
  const update = (name: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [name]: value }));
  if (employeeId && employee.isLoading) return <LoadingState />;
  return (
    <div className="page-fade narrow-page">
      <Link
        className="back-link"
        to={employeeId ? `/app/employees/${employeeId}` : "/app/employees"}
      >
        <ArrowLeft size={16} /> Back to employees
      </Link>
      <PageHeader
        eyebrow="PEOPLE / EMPLOYEES"
        title={employeeId ? "Edit employee" : "Add employee"}
        description="Keep your people records accurate and organized."
      />
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <section className="panel panel-pad">
          <h2 className="form-section-title">Personal information</h2>
          <div className="form-grid">
            <TextField
              label="Full name"
              required
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
            />
            <TextField
              label="Employee ID"
              required
              disabled={!!employeeId}
              value={form.employeeCode}
              onChange={(e) => update("employeeCode", e.target.value)}
            />
            <TextField
              label="Work email"
              type="email"
              required
              value={form.workEmail}
              onChange={(e) => update("workEmail", e.target.value)}
            />
            <TextField
              label="Phone number"
              value={form.phoneNumber}
              onChange={(e) => update("phoneNumber", e.target.value)}
            />
          </div>
        </section>
        <section className="panel panel-pad">
          <h2 className="form-section-title">Employment details</h2>
          <div className="form-grid">
            <TextField
              label="Join date"
              type="date"
              required
              disabled={!!employeeId}
              value={form.joinDate}
              onChange={(e) => update("joinDate", e.target.value)}
            />
            <SelectField
              label="Department"
              required
              value={form.departmentId}
              onChange={(e) => update("departmentId", e.target.value)}
              options={[
                { value: "", label: "Select department" },
                ...(departments.data ?? [])
                  .filter((d) => d.status === "ACTIVE")
                  .map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <SelectField
              label="Position"
              required
              value={form.positionId}
              onChange={(e) => update("positionId", e.target.value)}
              options={[
                { value: "", label: "Select position" },
                ...(positions.data ?? [])
                  .filter((p) => p.status === "ACTIVE")
                  .map((p) => ({ value: p.id, label: p.title })),
              ]}
            />
            <SelectField
              label="Direct manager"
              value={form.managerId}
              onChange={(e) => update("managerId", e.target.value)}
              options={[
                { value: "", label: "No manager" },
                ...(managers.data?.items ?? [])
                  .filter(
                    (m) =>
                      m.id !== employeeId &&
                      m.user &&
                      ["MANAGER", "HR_ADMIN"].includes(m.user.role),
                  )
                  .map((m) => ({ value: m.id, label: m.fullName })),
              ]}
            />
          </div>
        </section>
        {!employeeId && (
          <section className="panel panel-pad">
            <h2 className="form-section-title">Account access</h2>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={form.createAccount}
                onChange={(e) => update("createAccount", e.target.checked)}
              />
              Create a login account now
            </label>
            {form.createAccount && (
              <SelectField
                label="Account role"
                value={form.accountRole}
                onChange={(e) => update("accountRole", e.target.value)}
                options={[
                  { value: "EMPLOYEE", label: "Employee" },
                  { value: "MANAGER", label: "Manager" },
                  { value: "HR_ADMIN", label: "HR Admin" },
                ]}
              />
            )}
          </section>
        )}
        {mutation.error && <ErrorState error={mutation.error} />}
        <div className="form-actions">
          <Link to="/app/employees" className="btn btn-secondary">
            Cancel
          </Link>
          <PrimaryButton type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : employeeId ? "Save changes" : "Create employee"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
