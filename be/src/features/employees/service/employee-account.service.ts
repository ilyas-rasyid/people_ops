import { roleSchema } from "../payload/employees.schema";
import type { Route } from "../../../commons/routing/router";
import { z } from "zod";
import { db } from "../../../database/client";
import { actor } from "../../../commons/routing/router";
import { parse, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";

export const createAccount: Route["handler"] = async (ctx) => {
  const id = parse(uuid, ctx.params.id);
  const { role, password } = parse(
    roleSchema.extend({ password: z.string().min(12).optional() }),
    ctx.body,
  );
  const generated = password ?? crypto.randomUUID() + "!Aa7";
  const user = await db.user.create({
    data: {
      employeeId: id,
      role,
      passwordHash: await Bun.password.hash(generated, { algorithm: "argon2id" }),
      mustChangePassword: true,
      credentialExpiresAt: new Date(Date.now() + 48 * 3600_000),
    },
  });
  return { id: user.id, role: user.role, temporaryPassword: generated };
};

export const changeAccountRole: Route["handler"] = async (ctx) => {
  const id = parse(uuid, ctx.params.id);
  const { role } = parse(roleSchema, ctx.body);
  const user = await db.user.findUniqueOrThrow({ where: { employeeId: id } });
  if (["MANAGER", "HR_ADMIN"].includes(user.role) && !["MANAGER", "HR_ADMIN"].includes(role)) {
    invariant(
      !(await db.employee.count({ where: { managerId: id, status: "ACTIVE" } })),
      409,
      "EMPLOYEE_HAS_DEPENDENCIES",
      "Reassign direct reports first.",
    );
    invariant(
      !(await db.leaveRequest.count({ where: { approverId: user.id, status: "PENDING" } })),
      409,
      "EMPLOYEE_HAS_DEPENDENCIES",
      "Reassign pending approvals first.",
    );
  }
  return db.$transaction(async (tx) => {
    const result = await tx.user.update({ where: { id: user.id }, data: { role } });
    await tx.session.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        actorId: actor(ctx).userId,
        eventType: "USER_ROLE_CHANGED",
        resource: "User",
        resourceId: user.id,
        requestId: ctx.requestId,
      },
    });
    return { id: result.id, role: result.role };
  });
};

export const manageAccount: Route["handler"] = async (ctx) => {
  const id = parse(uuid, ctx.params.id);
  const action = ctx.params.action;
  invariant(
    ["activate", "deactivate", "reset-password"].includes(action!),
    404,
    "RESOURCE_NOT_FOUND",
    "Action not found.",
  );
  const user = await db.user.findUniqueOrThrow({ where: { employeeId: id } });
  invariant(
    user.id !== actor(ctx).userId || action !== "deactivate",
    409,
    "SELF_DEACTIVATION",
    "You cannot deactivate your own account.",
  );
  const temp = action === "reset-password" ? crypto.randomUUID() + "!Aa7" : null;
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: temp
        ? {
          passwordHash: await Bun.password.hash(temp, { algorithm: "argon2id" }),
          mustChangePassword: true,
          credentialExpiresAt: new Date(Date.now() + 48 * 3600_000),
        }
        : { status: action === "activate" ? "ACTIVE" : "INACTIVE" },
    });
    await tx.session.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor(ctx).userId,
        eventType: `ACCOUNT_${action?.toUpperCase().replace("-", "_")}`,
        resource: "User",
        resourceId: user.id,
        requestId: ctx.requestId,
      },
    });
  });
  return { id: user.id, action, ...(temp ? { temporaryPassword: temp } : {}) };
};
