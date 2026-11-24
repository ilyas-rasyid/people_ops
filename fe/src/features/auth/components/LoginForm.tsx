import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { ErrorState } from "../../../shared/components/Feedback";
import type { LoginState } from "../hooks/useLogin";

export function LoginForm({ state }: { state: LoginState; }) {
  return (
    <>
      {state.error && <ErrorState error={state.error} />}
      <form onSubmit={(event) => void state.submit(event)} className="form-stack">
        <label className="field">
          <span className="field-label">Work email</span>
          <input
            className="input"
            type="email"
            value={state.email}
            onChange={(event) => state.setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <span className="password-wrapper">
            <input
              className="input"
              type={state.showPassword ? "text" : "password"}
              value={state.password}
              onChange={(event) => state.setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => state.setShowPassword(!state.showPassword)}
              aria-label={state.showPassword ? "Hide password" : "Show password"}
            >
              {state.showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>
        <button className="btn btn-primary login-submit" disabled={state.busy} type="submit">
          {state.busy ? "Signing in..." : "Sign in"}
          <ArrowRight size={18} />
        </button>
      </form>
    </>
  );
}
