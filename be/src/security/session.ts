import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "../database/client";
import { AppError, invariant } from "../commons/errors/app-error";

const isProduction = process.env.APP_ENV === "production";
const cookieName = isProduction ? "__Host-peopleops_session" : "peopleops_dev_session";
const secret = process.env.SESSION_SECRET ?? "";
if (isProduction && secret.length < 32)
  throw new Error("SESSION_SECRET must contain at least 32 characters.");

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export type AuthSession = Awaited<ReturnType<typeof loadSession>>;

export async function loadSession(request: Request) {
  const cookies = Object.fromEntries(
    (request.headers.get("cookie") ?? "").split(";").map((part) => {
      const index = part.indexOf("=");
      return index < 0 ? ["", ""] : [part.slice(0, index).trim(), part.slice(index + 1)];
    }),
  );
  const token = cookies[cookieName];
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: { include: { employee: true } } },
  });
  const now = new Date();
  if (!session || session.revokedAt || session.expiresAt <= now || session.idleExpiresAt <= now)
    return null;
  if (session.user.status !== "ACTIVE" || session.user.employee.status !== "ACTIVE") return null;
  await db.session.update({
    where: { id: session.id },
    data: {
      lastSeenAt: now,
      idleExpiresAt: new Date(Math.min(session.expiresAt.getTime(), now.getTime() + 30 * 60_000)),
    },
  });
  return session;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const session = await db.session.create({
    data: {
      userId,
      tokenHash: hash(token),
      expiresAt: new Date(now + 12 * 3600_000),
      idleExpiresAt: new Date(now + 30 * 60_000),
    },
  });
  return {
    session,
    cookie: `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax${isProduction ? "; Secure" : ""}`,
  };
}

export function clearCookie() {
  return `${cookieName}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${isProduction ? "; Secure" : ""}`;
}

export function csrfToken(sessionId: string): string {
  return createHmac("sha256", secret || "peopleops-local-development-only")
    .update(sessionId)
    .digest("hex");
}

export function checkCsrf(request: Request, sessionId: string) {
  const given = request.headers.get("x-csrf-token") ?? "";
  const expected = csrfToken(sessionId);
  if (
    given.length !== expected.length ||
    !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  ) {
    throw new AppError(
      403,
      "CSRF_VALIDATION_FAILED",
      "Security token is missing or invalid. Refresh and retry.",
    );
  }
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
  const local = !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  invariant(origin === allowed || local, 403, "ORIGIN_DENIED", "Request origin is not allowed.");
}

export function publicUser(session: NonNullable<AuthSession>) {
  const { id, role, mustChangePassword } = session.user;
  const { id: employeeId, fullName, workEmail, employeeCode } = session.user.employee;
  return { id, role, mustChangePassword, employeeId, fullName, workEmail, employeeCode };
}
