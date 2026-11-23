import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, UsersRound } from "lucide-react";
import { api, resetCsrf } from "../../../shared/api/client";
import { useAuth } from "../../../app/providers/AuthProvider";
import { ErrorState } from "../../../shared/components/Feedback";

export function LoginPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("hr@example.com");
  const [password, setPassword] = useState("PeopleOpsDemo!2026");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  if (user)
    return (
      <Navigate
        to={user.mustChangePassword ? "/first-login/change-password" : "/app/dashboard"}
        replace
      />
    );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api("/auth/login", { method: "POST", body: { email, password } });
      resetCsrf();
      await refresh();
      navigate("/app/dashboard", { replace: true });
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-layout">
      <section className="login-brand-panel">
        <div className="login-brand">
          <span className="brand-symbol">
            <UsersRound size={20} />
          </span>
          peopleops<span className="brand-period">.</span>
        </div>
        <div className="login-promo">
          <span className="promo-eyebrow">NORTHSTAR · PEOPLE OPERATIONS</span>
          <h1>
            Good people.
            <br />
            Better work.
          </h1>
          <p>
            A thoughtful workspace for the people behind your business. One place for employee
            records, attendance, and leave.
          </p>
          <div className="promo-stat">
            <div>
              <strong>One workspace</strong>
              <span>Built for clarity</span>
            </div>
            <span className="promo-lines" aria-hidden="true">
              ···
            </span>
          </div>
        </div>
        <div className="login-panel-foot">PeopleOps HRIS · Portfolio demonstration</div>
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <span className="login-small-label">WELCOME BACK</span>
          <h2>Sign in to PeopleOps</h2>
          <p className="form-description">Enter your work credentials to continue.</p>
          {error && <ErrorState error={error} />}
          <form onSubmit={(event) => void submit(event)} className="form-stack">
            <label className="field">
              <span className="field-label">Work email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Password</span>
              <span className="password-wrapper">
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            <button className="btn btn-primary login-submit" disabled={busy} type="submit">
              {busy ? "Signing in..." : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="demo-access">
            <div className="demo-access-title">
              <LockKeyhole size={16} /> Demo access
            </div>
            <p>Use the seeded accounts to explore each role.</p>
            <div className="demo-role-list">
              {[
                { label: "HR Admin", email: "hr@example.com" },
                { label: "Manager", email: "manager@example.com" },
                { label: "Employee", email: "employee@example.com" },
              ].map((item) => (
                <button
                  key={item.email}
                  type="button"
                  onClick={() => {
                    setEmail(item.email);
                    setPassword("PeopleOpsDemo!2026");
                  }}
                >
                  <span>{item.label}</span>
                  <span>{item.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="login-copyright">© 2026 PeopleOps · Synthetic demo environment</p>
      </section>
    </div>
  );
}
