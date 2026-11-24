import type { Route } from "../../../commons/routing/router";
import { actor } from "../../../commons/routing/router";
import { clock } from "../service/attendance.service";

export const clockIn: Route["handler"] = async (ctx) => clock(actor(ctx).user.employeeId, "in");

export const clockOut: Route["handler"] = async (ctx) => clock(actor(ctx).user.employeeId, "out");
