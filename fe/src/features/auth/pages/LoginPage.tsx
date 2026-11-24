import { Navigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";
import { LoginForm } from "../components/LoginForm";
import { DemoAccess } from "../components/DemoAccess";
import { LoginBrandPanel } from "../components/LoginBrandPanel";
import { useLogin } from "../hooks/useLogin";

export function LoginPage() {
  const { user } = useAuth();
  const login = useLogin();

  if (user) {
    return (
      <Navigate
        to={user.mustChangePassword ? "/first-login/change-password" : "/app/dashboard"}
        replace
      />
    );
  }

  return (
    <div className="login-layout">
      <LoginBrandPanel />
      <section className="login-form-side">
        <div className="login-form-wrap">
          <span className="login-small-label">WELCOME BACK</span>
          <h2>Sign in to PeopleOps</h2>
          <p className="form-description">Enter your work credentials to continue.</p>
          <LoginForm state={login} />
          <DemoAccess onSelect={login.selectDemoAccount} />
        </div>
        <p className="login-copyright">© 2026 PeopleOps · Synthetic demo environment</p>
      </section>
    </div>
  );
}
