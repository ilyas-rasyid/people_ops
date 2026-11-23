import { z } from "zod";
import { db } from "../../../database/client";
import { parse } from "../../../commons/validation";
import { AppError, invariant } from "../../../commons/errors/app-error";
import { actor, route } from "../../../commons/routing/router";
import { createSession, clearCookie, csrfToken, publicUser } from "../../../security/session";
import {
  guardLoginAttempts,
  recordLoginFailure,
  clearLoginFailures,
} from "../../../security/rate-limit";

const credentials = z.strictObject({ email: z.email(), password: z.string().min(1) });
const passwordChange = z.strictObject({
  currentPassword: z.string(),
  newPassword: z.string().min(12).max(128),
});

export const authRoutes = [
  route("POST", "/api/v1/auth/login", "PUBLIC", async (ctx) => {
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
  }),
  route("GET", "/api/v1/auth/me", "AUTH", async (ctx) => publicUser(actor(ctx))),
  route("GET", "/api/v1/auth/csrf", "AUTH", async (ctx) => ({ token: csrfToken(actor(ctx).id) })),
  route("POST", "/api/v1/auth/logout", "AUTH", async (ctx) => {
    await db.session.update({ where: { id: actor(ctx).id }, data: { revokedAt: new Date() } });
    ctx.headers["set-cookie"] = clearCookie();
    return { loggedOut: true };
  }),
  route("POST", "/api/v1/auth/change-password", "AUTH", async (ctx) => {
    const session = actor(ctx);
    const data = parse(passwordChange, ctx.body);
    invariant(
      await Bun.password.verify(data.currentPassword, session.user.passwordHash),
      422,
      "INVALID_PASSWORD",
      "Current password is incorrect.",
    );
    const hash = await Bun.password.hash(data.newPassword, { algorithm: "argon2id" });
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.userId },
        data: { passwordHash: hash, mustChangePassword: false, credentialExpiresAt: null },
      });
      await tx.session.updateMany({
        where: { userId: session.userId },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          eventType: "PASSWORD_CHANGED",
          resource: "User",
          resourceId: session.userId,
          requestId: ctx.requestId,
        },
      });
    });
    ctx.headers["set-cookie"] = clearCookie();
    return { passwordChanged: true, reauthenticationRequired: true };
  }),
  route("POST", "/api/v1/auth/first-password-change", "AUTH", async (ctx) => {
    invariant(
      actor(ctx).user.mustChangePassword,
      409,
      "INVALID_STATE",
      "Password change is not required.",
    );
    const data = parse(passwordChange, ctx.body);
    invariant(
      await Bun.password.verify(data.currentPassword, actor(ctx).user.passwordHash),
      422,
      "INVALID_PASSWORD",
      "Current password is incorrect.",
    );
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor(ctx).userId },
        data: {
          passwordHash: await Bun.password.hash(data.newPassword, { algorithm: "argon2id" }),
          mustChangePassword: false,
          credentialExpiresAt: null,
        },
      });
      await tx.session.updateMany({
        where: { userId: actor(ctx).userId },
        data: { revokedAt: new Date() },
      });
    });
    ctx.headers["set-cookie"] = clearCookie();
    return { passwordChanged: true, reauthenticationRequired: true };
  }),
  route("GET", "/api/v1/account/security", "AUTH", async (ctx) => ({
    workEmail: actor(ctx).user.employee.workEmail,
    role: actor(ctx).user.role,
    mustChangePassword: actor(ctx).user.mustChangePassword,
  })),
];
