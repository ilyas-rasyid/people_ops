import type { Route } from "../../../commons/routing/router";
import { actor } from "../../../commons/routing/router";
import { parse, uuid } from "../../../commons/validation";
import { createEmployee, updateEmployee } from "../service/employee.service";
import { employeeCreate, employeeUpdate } from "../payload/employee.schema";

export const createEmployeeEndpoint: Route["handler"] = async (ctx) =>
  createEmployee(parse(employeeCreate, ctx.body), actor(ctx).userId, ctx.requestId);

export const updateEmployeeEndpoint: Route["handler"] = async (ctx) =>
  updateEmployee(
    parse(uuid, ctx.params.id),
    parse(employeeUpdate, ctx.body),
    actor(ctx).userId,
    ctx.requestId,
  );
