import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { PasswordChangePage } from "../../features/auth/pages/PasswordChangePage";
import { LoadingState } from "../../shared/components/Feedback";
import type { Role } from "../../shared/types/domain";

export function RequireSession({ children, roles }: { children: ReactNode; roles?: Role[]; }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="full-page-loader">
        <LoadingState label="Opening workspace..." />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/first-login/change-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

export function FirstLoginGate() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="standalone-password">
      <PasswordChangePage firstLogin />
    </div>
  );
}
