import { passwordChange } from "../payload/auth.schema";
import type { Route } from "../../../commons/routing/router";

import { db } from "../../../database/client";
import { parse } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor } from "../../../commons/routing/router";
import { clearCookie } from "../../../security/session";

export const changePassword: Route["handler"] = async (ctx) => {
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
};

export const completeFirstPasswordChange: Route["handler"] = async (ctx) => {
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
};
