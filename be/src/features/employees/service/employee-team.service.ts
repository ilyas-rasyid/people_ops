import type { Route } from "../../../commons/routing/router";
import { actor } from "../../../commons/routing/router";
import { parse, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import {
  listDirectReportsRepository,
  getDirectReportRepository,
} from "../repository/employee.repository";

export const listMyTeam: Route["handler"] = async (ctx) =>
  listDirectReportsRepository(actor(ctx).user.employeeId);

export const getTeamMember: Route["handler"] = async (ctx) => {
  const employee = await getDirectReportRepository(
    parse(uuid, ctx.params.id),
    actor(ctx).user.employeeId,
  );
  invariant(employee, 404, "RESOURCE_NOT_FOUND", "Employee not found.");
  return employee;
};
