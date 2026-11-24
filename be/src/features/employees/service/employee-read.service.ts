import type { Route } from "../../../commons/routing/router";
import { parse, pageQuery, uuid } from "../../../commons/validation";
import {
  listEmployeesRepository,
  getEmployeeRepository,
  getEmploymentHistoryRepository,
} from "../repository/employee.repository";

export const listEmployees: Route["handler"] = async (ctx) => {
  const { page, pageSize } = pageQuery(ctx.query);
  return listEmployeesRepository({
    page,
    pageSize,
    search: ctx.query.get("search")?.trim(),
    departmentId: ctx.query.get("departmentId") || undefined,
    status: ctx.query.get("status") || undefined,
  });
};

export const getEmployeeDetail: Route["handler"] = async (ctx) =>
  getEmployeeRepository(parse(uuid, ctx.params.id));

export const getEmployeeHistory: Route["handler"] = async (ctx) =>
  getEmploymentHistoryRepository(parse(uuid, ctx.params.id));
