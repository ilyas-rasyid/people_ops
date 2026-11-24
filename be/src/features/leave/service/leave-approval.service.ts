import { decisionSchema } from "../payload/leave.schema";
import type { Route } from "../../../commons/routing/router";
import { z } from "zod";
import { db } from "../../../database/client";
import { parse, pageQuery, reason, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor } from "../../../commons/routing/router";
import { cancelLeave, decideLeave } from "../service/leave-decisions.service";

const requestInclude = {
  leaveType: true,
  employee: {
    select: { id: true, fullName: true, employeeCode: true, departmentId: true },
  },
  approver: { select: { id: true, employee: { select: { fullName: true } } } },
  reservation: true,
} as const;

async function listRequests(
  where: { employeeId?: string; approverId?: string; status?: string; },
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

export const listApprovals: Route["handler"] = async (ctx) => {
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
};

export const getApprovalDetail: Route["handler"] = async (ctx) => {
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
};

export const approveLeaveRequest: Route["handler"] = async (ctx) => {
  const data = parse(decisionSchema, ctx.body);
  return decideLeave(
    parse(uuid, ctx.params.id),
    actor(ctx).userId,
    actor(ctx).user.role,
    "approve",
    data.reason,
    ctx.requestId,
  );
};

export const rejectLeaveRequest: Route["handler"] = async (ctx) => {
  const data = parse(decisionSchema, ctx.body);
  return decideLeave(
    parse(uuid, ctx.params.id),
    actor(ctx).userId,
    actor(ctx).user.role,
    "reject",
    data.reason,
    ctx.requestId,
  );
};

export const cancelApprovedLeave: Route["handler"] = async (ctx) => {
  const data = parse(z.strictObject({ reason }), ctx.body);
  return cancelLeave(
    parse(uuid, ctx.params.id),
    actor(ctx).userId,
    "HR_ADMIN",
    data.reason,
    ctx.requestId,
  );
};
