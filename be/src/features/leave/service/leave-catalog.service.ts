import type { Route } from "../../../commons/routing/router";
import { db } from "../../../database/client";
import { parse, dateOnly, uuid } from "../../../commons/validation";
import { actor } from "../../../commons/routing/router";
import { annualBalance, leavePreview } from "../service/leave.service";

export const listLeaveTypes: Route["handler"] = async () =>
  db.leaveType.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

export const getMyAnnualBalance: Route["handler"] = async (ctx) => {
  const year = Number(ctx.query.get("year") || new Date().getFullYear());
  return annualBalance(actor(ctx).user.employeeId, year);
};

export const previewMyLeave: Route["handler"] = async (ctx) =>
  leavePreview(
    actor(ctx).user.employeeId,
    parse(uuid, ctx.query.get("leaveTypeId")),
    parse(dateOnly, ctx.query.get("startDate")),
    parse(dateOnly, ctx.query.get("endDate")),
  );

export const getEmployeeAnnualBalance: Route["handler"] = async (ctx) =>
  annualBalance(
    parse(uuid, ctx.params.id),
    Number(ctx.query.get("year") || new Date().getFullYear()),
  );
