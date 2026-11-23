import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/client";
import type { Employee, Role } from "../../../shared/types/domain";
import { ErrorState } from "../../../shared/components/Feedback";
import { PrimaryButton, SecondaryButton, SelectField } from "../../../shared/components/Controls";
import { Modal } from "../../../shared/components/Modal";
import { StatusBadge } from "../../../shared/components/StatusBadge";

export function AccountAccessPanel({ employee }: { employee: Employee }) {
  const [role, setRole] = useState<Role>(employee.user?.role ?? "EMPLOYEE");
  const [action, setAction] = useState<"reset-password" | "deactivate" | "activate" | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: (operation: string) =>
      api<{ temporaryPassword?: string }>(
        employee.user
          ? operation === "role"
            ? `/employees/${employee.id}/account/role`
            : `/employees/${employee.id}/account/${operation}`
          : `/employees/${employee.id}/account`,
        {
          method: operation === "role" ? "PATCH" : "POST",
          idempotent: operation !== "role",
          body: operation === "role" || !employee.user ? { role } : {},
        },
      ),
    onSuccess: async (result) => {
      setTemporaryPassword(result.temporaryPassword ?? null);
      setAction(null);
      await cache.invalidateQueries({ queryKey: ["employee", employee.id] });
    },
  });
  return (
    <div className="panel-pad form-stack">
      <h2 className="form-section-title">Account & access</h2>
      <div className="detail-grid detail-grid-unpadded">
        <div className="detail-field">
          <span>Account status</span>
          {employee.user ? (
            <StatusBadge status={employee.user.status} />
          ) : (
            <strong>No account</strong>
          )}
        </div>
        <div className="detail-field">
          <span>Current role</span>
          <strong>{employee.user?.role.replace("_", " ") ?? "Not assigned"}</strong>
        </div>
      </div>
      <SelectField
        label="Application role"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        options={[
          { value: "EMPLOYEE", label: "Employee" },
          { value: "MANAGER", label: "Manager" },
          { value: "HR_ADMIN", label: "HR Admin" },
        ]}
      />
      <div className="inline-actions">
        {employee.user ? (
          <>
            <PrimaryButton
              disabled={mutation.isPending || role === employee.user.role}
              onClick={() => mutation.mutate("role")}
            >
              Change role
            </PrimaryButton>
            <SecondaryButton onClick={() => setAction("reset-password")}>
              Reset credentials
            </SecondaryButton>
            <SecondaryButton
              onClick={() =>
                setAction(employee.user!.status === "ACTIVE" ? "deactivate" : "activate")
              }
            >
              {employee.user.status === "ACTIVE" ? "Deactivate account" : "Activate account"}
            </SecondaryButton>
          </>
        ) : (
          <PrimaryButton disabled={mutation.isPending} onClick={() => mutation.mutate("create")}>
            Create login account
          </PrimaryButton>
        )}
      </div>
      {mutation.error && <ErrorState error={mutation.error} />}
      {temporaryPassword && (
        <div className="credential-notice" role="status">
          <strong>One-time temporary password</strong>
          <p>
            Copy this credential securely. It cannot be displayed again after you leave this view.
          </p>
          <code>{temporaryPassword}</code>
          <button
            className="btn btn-secondary"
            onClick={() => void navigator.clipboard.writeText(temporaryPassword)}
          >
            Copy password
          </button>
          <button className="text-link" onClick={() => setTemporaryPassword(null)}>
            Dismiss secret
          </button>
        </div>
      )}
      {action && (
        <Modal
          title={
            action === "reset-password"
              ? "Reset credentials"
              : action === "activate"
                ? "Activate account"
                : "Deactivate account"
          }
          onClose={() => setAction(null)}
          footer={
            <>
              <SecondaryButton onClick={() => setAction(null)}>Cancel</SecondaryButton>
              <PrimaryButton disabled={mutation.isPending} onClick={() => mutation.mutate(action)}>
                Confirm
              </PrimaryButton>
            </>
          }
        >
          <p>This action will invalidate the employee's existing login sessions.</p>
          {mutation.error && <ErrorState error={mutation.error} />}
        </Modal>
      )}
    </div>
  );
}
