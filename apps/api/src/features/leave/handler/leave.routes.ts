import { z } from "zod";
import { db } from "../../../database/client";
import { parse, dateOnly, note, pageQuery, reason, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor, route } from "../../../commons/routing/router";
import { annualBalance, leavePreview, submitLeave, lockEmployee } from "../service/leave.service";
import { cancelLeave, decideLeave } from "../service/leave-decisions.service";

const requestSchema = z.strictObject({
  leaveTypeId: uuid,
  startDate: dateOnly,
  endDate: dateOnly,
  note,
});
const decisionSchema = z.strictObject({
  reason: z.string().max(1000).optional(),
  expectedVersion: z.number().int().positive().optional(),
});
const cancelSchema = z.strictObject({ reason: z.string().max(1000).optional() });
const adjustmentSchema = z.strictObject({
  deltaDays: z
    .number()
    .int()
    .refine((value) => value !== 0),
  reason,
});
const requestInclude = {
  leaveType: true,
  employee: {
    select: { id: true, fullName: true, employeeCode: true, departmentId: true },
  },
  approver: { select: { id: true, employee: { select: { fullName: true } } } },
  reservation: true,
} as const;

async function listRequests(
  where: { employeeId?: string; approverId?: string; status?: string },
  query: URLSearchParams,
) {
  const { page, pageSize } = pageQuery(query);
  const finalWhere = { ...where, ...(query.get("status") ? { status: query.get("status")! } : {}) };
  const [items, total] = await Promise.all([
    db.leaveRequest.findMany({
      where: finalWhere,
      include: requestInclude,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.leaveRequest.count({ where: finalWhere }),
  ]);
  return { items, total, page, pageSize };
}

export const leaveRoutes = [
  route("GET", "/api/v1/leave-types", "AUTH", async () =>
    db.leaveType.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ),
  route("GET", "/api/v1/me/leave/balance", "AUTH", async (ctx) => {
    const year = Number(ctx.query.get("year") || new Date().getFullYear());
    return annualBalance(actor(ctx).user.employeeId, year);
  }),
  route("GET", "/api/v1/me/leave/preview", "AUTH", async (ctx) =>
    leavePreview(
      actor(ctx).user.employeeId,
      parse(uuid, ctx.query.get("leaveTypeId")),
      parse(dateOnly, ctx.query.get("startDate")),
      parse(dateOnly, ctx.query.get("endDate")),
    ),
  ),
  route("GET", "/api/v1/me/leave/requests", "AUTH", async (ctx) =>
    listRequests({ employeeId: actor(ctx).user.employeeId }, ctx.query),
  ),
  route(
    "POST",
    "/api/v1/me/leave/requests",
    "AUTH",
    async (ctx) => {
      const data = parse(requestSchema, ctx.body);
      return submitLeave(
        actor(ctx).user.employeeId,
        actor(ctx).userId,
        data.leaveTypeId,
        data.startDate,
        data.endDate,
        data.note,
        ctx.requestId,
      );
    },
    true,
  ),
  route("GET", "/api/v1/me/leave/requests/:id", "AUTH", async (ctx) => {
    const result = await db.leaveRequest.findFirst({
      where: {
        id: parse(uuid, ctx.params.id),
        employeeId: actor(ctx).user.employeeId,
      },
      include: requestInclude,
    });
    invariant(result, 404, "RESOURCE_NOT_FOUND", "Leave request not found.");
    return result;
  }),
  route(
    "POST",
    "/api/v1/me/leave/requests/:id/cancel",
    "AUTH",
    async (ctx) => {
      const data = parse(cancelSchema, ctx.body);
      return cancelLeave(
        parse(uuid, ctx.params.id),
        actor(ctx).userId,
        actor(ctx).user.role,
        data.reason,
        ctx.requestId,
      );
    },
    true,
  ),
  route("GET", "/api/v1/leave/requests", "HR", async (ctx) => listRequests({}, ctx.query)),
  route("GET", "/api/v1/leave/requests/:id", "HR", async (ctx) =>
    db.leaveRequest.findUniqueOrThrow({
      where: { id: parse(uuid, ctx.params.id) },
      include: requestInclude,
    }),
  ),
  route("GET", "/api/v1/approvals", "AUTH", async (ctx) => {
    invariant(
      ["HR_ADMIN", "MANAGER"].includes(actor(ctx).user.role),
      403,
      "PERMISSION_DENIED",
      "Approval access is restricted.",
    );
    return listRequests(
      actor(ctx).user.role === "MANAGER"
        ? {
            approverId: actor(ctx).userId,
          }
        : {},
      ctx.query,
    );
  }),
  route("GET", "/api/v1/approvals/:id", "AUTH", async (ctx) => {
    const result = await db.leaveRequest.findUniqueOrThrow({
      where: { id: parse(uuid, ctx.params.id) },
      include: requestInclude,
    });
    invariant(
      actor(ctx).user.role === "HR_ADMIN" || result.approverId === actor(ctx).userId,
      404,
      "RESOURCE_NOT_FOUND",
      "Approval not found.",
    );
    return result;
  }),
  route(
    "POST",
    "/api/v1/leave/requests/:id/approve",
    "AUTH",
    async (ctx) => {
      const data = parse(decisionSchema, ctx.body);
      return decideLeave(
        parse(uuid, ctx.params.id),
        actor(ctx).userId,
        actor(ctx).user.role,
        "approve",
        data.reason,
        ctx.requestId,
      );
    },
    true,
  ),
  route(
    "POST",
    "/api/v1/leave/requests/:id/reject",
    "AUTH",
    async (ctx) => {
      const data = parse(decisionSchema, ctx.body);
      return decideLeave(
        parse(uuid, ctx.params.id),
        actor(ctx).userId,
        actor(ctx).user.role,
        "reject",
        data.reason,
        ctx.requestId,
      );
    },
    true,
  ),
  route(
    "POST",
    "/api/v1/leave/requests/:id/cancel",
    "HR",
    async (ctx) => {
      const data = parse(z.strictObject({ reason }), ctx.body);
      return cancelLeave(
        parse(uuid, ctx.params.id),
        actor(ctx).userId,
        "HR_ADMIN",
        data.reason,
        ctx.requestId,
      );
    },
    true,
  ),
  route("GET", "/api/v1/employees/:id/leave/balance", "HR", async (ctx) =>
    annualBalance(
      parse(uuid, ctx.params.id),
      Number(ctx.query.get("year") || new Date().getFullYear()),
    ),
  ),
  route(
    "POST",
    "/api/v1/employees/:id/leave/entitlements/:year/adjustments",
    "HR",
    async (ctx) => {
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
    },
    true,
  ),
];
