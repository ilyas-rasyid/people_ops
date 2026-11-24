import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../shared/api/client";
import { useAuth } from "../../../app/providers/AuthProvider";
import { PageHeader } from "../../../shared/components/PageHeader";
import { TextField, PrimaryButton } from "../../../shared/components/Controls";
import { ErrorState } from "../../../shared/components/Feedback";

export function PasswordChangePage({ firstLogin = false }: { firstLogin?: boolean; }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirm) {
      setError(new Error("Passwords do not match."));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await api(firstLogin ? "/auth/first-password-change" : "/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      await logout();
      navigate("/login", { replace: true });
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="narrow-page">
      <PageHeader
        eyebrow="ACCOUNT SECURITY"
        title="Change password"
        description={
          firstLogin
            ? "Replace your temporary password to activate full access."
            : "Keep your PeopleOps account protected with a strong password."
        }
      />
      <div className="panel panel-pad">
        {error ? <ErrorState error={error} /> : null}
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <TextField
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            minLength={12}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            hint="At least 12 characters."
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <div className="form-actions">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Updating..." : "Update password"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
