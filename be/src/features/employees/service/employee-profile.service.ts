import { selfContact } from "../payload/employees.schema";
import type { Route } from "../../../commons/routing/router";

import { db } from "../../../database/client";
import { actor } from "../../../commons/routing/router";
import { parse } from "../../../commons/validation";

export const getMyProfile: Route["handler"] = async (ctx) => actor(ctx).user.employee;

export const updateMyContact: Route["handler"] = async (ctx) => {
  const data = parse(selfContact, ctx.body);
  return db.employee.update({ where: { id: actor(ctx).user.employeeId }, data });
};
