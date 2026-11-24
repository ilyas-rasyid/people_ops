import type { Route } from "../../../commons/routing/router";
import { db } from "../../../database/client";
import { pageQuery, uuid, parse } from "../../../commons/validation";

export const listAuditLogs: Route["handler"] = async (ctx) => {
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
};

export const getAuditLogDetail: Route["handler"] = async (ctx) =>
  db.auditLog.findUniqueOrThrow({ where: { id: parse(uuid, ctx.params.id) } });
