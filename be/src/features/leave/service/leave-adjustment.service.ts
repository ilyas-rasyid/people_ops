import { adjustmentSchema } from "../payload/leave.schema";
import type { Route } from "../../../commons/routing/router";

import { db } from "../../../database/client";
import { parse, reason, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor } from "../../../commons/routing/router";
import { annualBalance, lockEmployee } from "../service/leave.service";

export const adjustEmployeeEntitlement: Route["handler"] = async (ctx) => {
  const employeeId = parse(uuid, ctx.params.id);
  const year = Number(ctx.params.year);
  invariant(year >= 2020 && year <= 2100, 422, "INVALID_YEAR", "Year is invalid.");
  const data = parse(adjustmentSchema, ctx.body);
  return db.$transaction(async (tx) => {
    await lockEmployee(tx, employeeId);
    const annual = await tx.leaveType.findUniqueOrThrow({ where: { code: "ANNUAL" } });
    const entitlement = await tx.leaveEntitlement.findUniqueOrThrow({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId: annual.id, year },
      },
    });
    const balance = await annualBalance(employeeId, year, tx);
    invariant(
      balance.available + data.deltaDays >= 0,
      422,
      "LEAVE_INSUFFICIENT_BALANCE",
      "Adjustment would make available leave negative.",
    );
    const record = await tx.leaveBalanceLedger.create({
      data: {
        entitlementId: entitlement.id,
        eventType: "ADJUSTMENT",
        deltaDays: data.deltaDays,
        reason: data.reason,
        actorId: actor(ctx).userId,
        eventKey: `adjust:${ctx.requestId}`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor(ctx).userId,
        eventType: "LEAVE_BALANCE_ADJUSTED",
        resource: "LeaveEntitlement",
        resourceId: entitlement.id,
        reason: data.reason,
        requestId: ctx.requestId,
      },
    });
    return record;
  });
};
