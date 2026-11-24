import {
  listLeaveRequestsRepository,
  getOwnLeaveRequestRepository,
  getLeaveRequestRepository,
} from "../repository/leave-request.repository";
import { cancelSchema, requestSchema } from "../payload/leave.schema";
import type { Route } from "../../../commons/routing/router";

import { parse, note, pageQuery, reason, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor } from "../../../commons/routing/router";
import { submitLeave } from "../service/leave.service";
import { cancelLeave } from "../service/leave-decisions.service";

async function listRequests(
  where: { employeeId?: string; approverId?: string; status?: string; },
  query: URLSearchParams,
) {
  const { page, pageSize } = pageQuery(query);
  const finalWhere = {
    ...where,
    ...(query.get("status") ? { status: query.get("status")! } : {}),
  };
  return listLeaveRequestsRepository(finalWhere, page, pageSize);
}

export const listMyLeaveRequests: Route["handler"] = async (ctx) =>
  listRequests({ employeeId: actor(ctx).user.employeeId }, ctx.query);

export const submitMyLeave: Route["handler"] = async (ctx) => {
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
};

export const getMyLeaveRequest: Route["handler"] = async (ctx) => {
  const result = await getOwnLeaveRequestRepository(
    parse(uuid, ctx.params.id),
    actor(ctx).user.employeeId,
  );
  invariant(result, 404, "RESOURCE_NOT_FOUND", "Leave request not found.");
  return result;
};

export const cancelMyLeave: Route["handler"] = async (ctx) => {
  const data = parse(cancelSchema, ctx.body);
  return cancelLeave(
    parse(uuid, ctx.params.id),
    actor(ctx).userId,
    actor(ctx).user.role,
    data.reason,
    ctx.requestId,
  );
};

export const listAllLeaveRequests: Route["handler"] = async (ctx) => listRequests({}, ctx.query);

export const getLeaveRequestForHr: Route["handler"] = async (ctx) =>
  getLeaveRequestRepository(parse(uuid, ctx.params.id));
