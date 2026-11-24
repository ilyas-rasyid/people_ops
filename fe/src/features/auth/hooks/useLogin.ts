import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";
import { authenticationService } from "../services/authentication.service";

export function useLogin() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("hr@example.com");
  const [password, setPassword] = useState("PeopleOpsDemo!2026");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await authenticationService.login(email, password);
      await refresh();
      navigate("/app/dashboard", { replace: true });
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }

  function selectDemoAccount(selectedEmail: string) {
    setEmail(selectedEmail);
    setPassword("PeopleOpsDemo!2026");
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    busy,
    error,
    submit,
    selectDemoAccount,
  };
}

export type LoginState = ReturnType<typeof useLogin>;
