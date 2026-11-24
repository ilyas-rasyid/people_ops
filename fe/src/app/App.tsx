import { AuthProvider } from "./providers/AuthProvider";
import { ApplicationRoutes } from "./router/ApplicationRoutes";

export function App() {
  return (
    <AuthProvider>
      <ApplicationRoutes />
    </AuthProvider>
  );
}
