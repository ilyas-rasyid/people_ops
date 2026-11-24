import { route } from "../../../commons/routing/router";
import { listAuditLogs, getAuditLogDetail } from "../service/audit.service";

export const auditRoutes = [
  route("GET", "/api/v1/audit-logs", "HR", listAuditLogs),
  route("GET", "/api/v1/audit-logs/:id", "HR", getAuditLogDetail),
];
