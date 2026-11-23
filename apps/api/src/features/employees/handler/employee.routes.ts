import { z } from "zod";
import { db } from "../../../database/client";
import { actor, route } from "../../../commons/routing/router";
import { parse, pageQuery, reason, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { createEmployee, updateEmployee, employeeInclude } from "../service/employee.service";
import { employeeCreate, employeeUpdate } from "../schema/employee.schema";

const selfContact = z.strictObject({ phoneNumber: z.string().max(30).nullable() });
const actionReason = z.strictObject({ reason });
const roleSchema = z.strictObject({ role: z.enum(["HR_ADMIN", "MANAGER", "EMPLOYEE"]) });
const secretSchema = z.strictObject({ password: z.string().min(12) });
const teamProjection = {
  id: true,
  employeeCode: true,
  fullName: true,
  workEmail: true,
  departmentId: true,
  positionId: true,
  managerId: true,
  joinDate: true,
  status: true,
  version: true,
  department: { select: { id: true, name: true, status: true } },
  position: { select: { id: true, title: true, status: true } },
} as const;
const employeeProjection = {
  ...employeeInclude,
  user: {
    select: { id: true, role: true, status: true, mustChangePassword: true },
  },
} as const;

export const employeeRoutes = [
  route("GET", "/api/v1/employees", "HR", async (ctx) => {
    const { page, pageSize } = pageQuery(ctx.query);
    const search = ctx.query.get("search")?.trim();
    const departmentId = ctx.query.get("departmentId") || undefined;
    const status = ctx.query.get("status") || undefined;
    const where = {
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" as const } },
              { employeeCode: { contains: search, mode: "insensitive" as const } },
              { workEmail: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(status ? { status } : {}),
    };
    const [items, total] = await Promise.all([
      db.employee.findMany({
        where,
        include: employeeProjection,
        orderBy: [{ fullName: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.employee.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }),
  route(
    "POST",
    "/api/v1/employees",
    "HR",
    async (ctx) =>
      createEmployee(parse(employeeCreate, ctx.body), actor(ctx).userId, ctx.requestId),
    true,
  ),
  route("GET", "/api/v1/employees/:id", "HR", async (ctx) =>
    db.employee.findUniqueOrThrow({
      where: { id: parse(uuid, ctx.params.id) },
      include: employeeProjection,
    }),
  ),
  route("PATCH", "/api/v1/employees/:id", "HR", async (ctx) =>
    updateEmployee(
      parse(uuid, ctx.params.id),
      parse(employeeUpdate, ctx.body),
      actor(ctx).userId,
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/employees/:id/employment-history", "HR", async (ctx) =>
    db.employmentRecord.findMany({
      where: { employeeId: parse(uuid, ctx.params.id) },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ),
  route(
    "POST",
    "/api/v1/employees/:id/deactivate",
    "HR",
    async (ctx) => {
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
    },
    true,
  ),
  route(
    "POST",
    "/api/v1/employees/:id/activate",
    "HR",
    async (ctx) => {
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
    },
    true,
  ),
  route(
    "POST",
    "/api/v1/employees/:id/account",
    "HR",
    async (ctx) => {
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
    },
    true,
  ),
  route("PATCH", "/api/v1/employees/:id/account/role", "HR", async (ctx) => {
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
  }),
  route(
    "POST",
    "/api/v1/employees/:id/account/:action",
    "HR",
    async (ctx) => {
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
    },
    true,
  ),
  route("GET", "/api/v1/me/profile", "AUTH", async (ctx) => actor(ctx).user.employee),
  route("PATCH", "/api/v1/me/profile/contact", "AUTH", async (ctx) => {
    const data = parse(selfContact, ctx.body);
    return db.employee.update({ where: { id: actor(ctx).user.employeeId }, data });
  }),
  route("GET", "/api/v1/team", "MANAGER", async (ctx) =>
    db.employee.findMany({
      where: { managerId: actor(ctx).user.employeeId },
      select: teamProjection,
      orderBy: { fullName: "asc" },
    }),
  ),
  route("GET", "/api/v1/team/:id", "MANAGER", async (ctx) => {
    const employee = await db.employee.findFirst({
      where: {
        id: parse(uuid, ctx.params.id),
        managerId: actor(ctx).user.employeeId,
      },
      select: teamProjection,
    });
    invariant(employee, 404, "RESOURCE_NOT_FOUND", "Employee not found.");
    return employee;
  }),
];
