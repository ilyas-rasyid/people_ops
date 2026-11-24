import { actionReason } from "../payload/employees.schema";
import type { Route } from "../../../commons/routing/router";

import { db } from "../../../database/client";
import { actor } from "../../../commons/routing/router";
import { parse, reason, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";

export const deactivateEmployee: Route["handler"] = async (ctx) => {
  const id = parse(uuid, ctx.params.id);
  const { reason: explanation } = parse(actionReason, ctx.body);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Employee" WHERE "id" = ${id} FOR UPDATE`;
    const employee = await tx.employee.findUniqueOrThrow({
      where: { id },
      include: { user: true },
    });
    invariant(
      employee.status === "ACTIVE",
      409,
      "INVALID_STATE",
      "Employee is already inactive.",
    );
    invariant(
      employee.user?.id !== actor(ctx).userId,
      409,
      "SELF_DEACTIVATION",
      "Another authorized HR administrator must deactivate your account.",
    );
    const [reports, pending, future, assigned] = await Promise.all([
      tx.employee.count({ where: { managerId: id, status: "ACTIVE" } }),
      tx.leaveRequest.count({ where: { employeeId: id, status: "PENDING" } }),
      tx.leaveRequest.count({
        where: { employeeId: id, status: "APPROVED", endDate: { gte: new Date() } },
      }),
      employee.user
        ? tx.leaveRequest.count({ where: { approverId: employee.user.id, status: "PENDING" } })
        : Promise.resolve(0),
    ]);
    invariant(
      !(reports + pending + future + assigned),
      409,
      "EMPLOYEE_HAS_DEPENDENCIES",
      "Resolve reports, leave, and approvals before deactivation.",
    );
    const result = await tx.employee.update({
      where: { id },
      data: {
        status: "INACTIVE",
        deactivatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (employee.user) {
      await tx.user.update({ where: { id: employee.user.id }, data: { status: "INACTIVE" } });
      await tx.session.updateMany({
        where: { userId: employee.user.id },
        data: {
          revokedAt: new Date(),
        },
      });
    }
    await tx.employmentRecord.create({
      data: {
        employeeId: id,
        eventType: "DEACTIVATED",
        actorId: actor(ctx).userId,
        reason: explanation,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor(ctx).userId,
        eventType: "EMPLOYEE_DEACTIVATED",
        resource: "Employee",
        resourceId: id,
        reason: explanation,
        requestId: ctx.requestId,
      },
    });
    return result;
  });
};

export const reactivateEmployee: Route["handler"] = async (ctx) => {
  const id = parse(uuid, ctx.params.id);
  return db.$transaction(async (tx) => {
    const result = await tx.employee.update({
      where: { id },
      data: { status: "ACTIVE", deactivatedAt: null, version: { increment: 1 } },
    });
    await tx.employmentRecord.create({
      data: { employeeId: id, eventType: "ACTIVATED", actorId: actor(ctx).userId },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor(ctx).userId,
        eventType: "EMPLOYEE_ACTIVATED",
        resource: "Employee",
        resourceId: id,
        requestId: ctx.requestId,
      },
    });
    return result;
  });
};
