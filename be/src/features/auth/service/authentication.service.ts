import { credentials } from "../payload/auth.schema";
import type { Route } from "../../../commons/routing/router";

import { db } from "../../../database/client";
import { parse } from "../../../commons/validation";
import { AppError } from "../../../commons/errors/app-error";
import { actor } from "../../../commons/routing/router";
import { createSession, clearCookie, csrfToken, publicUser } from "../../../security/session";
import { guardLoginAttempts, recordLoginFailure, clearLoginFailures } from "../../../security/rate-limit";

export const login: Route["handler"] = async (ctx) => {
  const data = parse(credentials, ctx.body);
  guardLoginAttempts(data.email);
  const employee = await db.employee.findUnique({
    where: { workEmail: data.email.trim().toLowerCase() },
    include: { user: true },
  });
  const valid =
    employee?.user &&
    employee.status === "ACTIVE" &&
    employee.user.status === "ACTIVE" &&
    (!employee.user.mustChangePassword ||
      !employee.user.credentialExpiresAt ||
      employee.user.credentialExpiresAt > new Date()) &&
    (await Bun.password.verify(data.password, employee.user.passwordHash));
  if (!valid) {
    recordLoginFailure(data.email);
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  clearLoginFailures(data.email);
  const { cookie } = await createSession(employee.user!.id);
  ctx.headers["set-cookie"] = cookie;
  return {
    id: employee.user!.id,
    employeeId: employee.id,
    fullName: employee.fullName,
    role: employee.user!.role,
    mustChangePassword: employee.user!.mustChangePassword,
  };
};

export const getCurrentUser: Route["handler"] = async (ctx) => publicUser(actor(ctx));

export const getCsrfToken: Route["handler"] = async (ctx) => ({ token: csrfToken(actor(ctx).id) });

export const logout: Route["handler"] = async (ctx) => {
  await db.session.update({ where: { id: actor(ctx).id }, data: { revokedAt: new Date() } });
  ctx.headers["set-cookie"] = clearCookie();
  return { loggedOut: true };
};

export const getSecuritySummary: Route["handler"] = async (ctx) => ({
  workEmail: actor(ctx).user.employee.workEmail,
  role: actor(ctx).user.role,
  mustChangePassword: actor(ctx).user.mustChangePassword,
});
