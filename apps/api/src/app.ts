import { Elysia } from "elysia";
import { createHealthHandler } from "./health/handler/health.handler";
import type { HealthDependencies } from "./health/handler/health.handler";
import { dispatch } from "./commons/routing/router";
import { authRoutes } from "./features/auth/handler/auth.routes";
import { organizationRoutes } from "./features/organization/handler/organization.routes";
import { employeeRoutes } from "./features/employees/handler/employee.routes";
import { attendanceRoutes } from "./features/attendance/handler/attendance.routes";
import { leaveRoutes } from "./features/leave/handler/leave.routes";
import { settingsRoutes } from "./features/settings/handler/settings.routes";
import { dashboardRoutes } from "./features/dashboard/handler/dashboard.routes";
import { auditRoutes } from "./features/audit/handler/audit.routes";

const routes = [
  ...authRoutes,
  ...organizationRoutes,
  ...employeeRoutes,
  ...attendanceRoutes,
  ...leaveRoutes,
  ...settingsRoutes,
  ...dashboardRoutes,
  ...auditRoutes,
];

export function createApp(dependencies: HealthDependencies) {
  return new Elysia()
    .use(createHealthHandler(dependencies))
    .all("/api/v1/*", async ({ request, set }) => {
      const result = await dispatch(request, routes);
      set.status = result.status;
      for (const [key, value] of Object.entries(result.headers)) set.headers[key] = value;
      return result.body;
    });
}
