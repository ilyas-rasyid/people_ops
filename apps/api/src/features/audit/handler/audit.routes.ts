import { db } from "../../../database/client";
import { pageQuery, uuid, parse } from "../../../commons/validation";
import { route } from "../../../commons/routing/router";

export const auditRoutes = [
  route("GET", "/api/v1/audit-logs", "HR", async (ctx) => {
    const { page, pageSize } = pageQuery(ctx.query);
    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count(),
    ]);
    return { items, total, page, pageSize };
  }),
  route("GET", "/api/v1/audit-logs/:id", "HR", async (ctx) =>
    db.auditLog.findUniqueOrThrow({ where: { id: parse(uuid, ctx.params.id) } }),
  ),
];
