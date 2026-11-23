import { createHash } from "node:crypto";
import { db } from "../../database/client";
import { AppError, invariant } from "../errors/app-error";
import { checkCsrf, checkOrigin, loadSession } from "../../security/session";
import type { AuthSession } from "../../security/session";

export type Access = "PUBLIC" | "AUTH" | "HR" | "MANAGER";
export type Context = {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  session: NonNullable<AuthSession> | null;
  headers: Record<string, string>;
  requestId: string;
};
export type Route = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  access: Access;
  handler: (ctx: Context) => Promise<unknown>;
  idempotent?: boolean;
};
export const route = (
  method: Route["method"],
  path: string,
  access: Access,
  handler: Route["handler"],
  idempotent = false,
): Route => ({ method, path, access, handler, idempotent });

function matchPath(template: string, pathname: string): Record<string, string> | null {
  const expected = template.split("/").filter(Boolean);
  const actual = pathname.split("/").filter(Boolean);
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < expected.length; i++) {
    const part = expected[i]!;
    if (part.startsWith(":")) params[part.slice(1)] = decodeURIComponent(actual[i]!);
    else if (part !== actual[i]) return null;
  }
  return params;
}

function failure(error: unknown, requestId: string) {
  if (error instanceof AppError)
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message, requestId } },
    };
  const prismaError = error as { code?: string };
  if (prismaError?.code === "P2002")
    return {
      status: 409,
      body: {
        error: {
          code: "DUPLICATE_RESOURCE",
          message: "A record with this value already exists.",
          requestId,
        },
      },
    };
  console.error("API error", { requestId, error });
  return {
    status: 500,
    body: {
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred.", requestId },
    },
  };
}

export async function dispatch(request: Request, routes: Route[]) {
  const requestId = crypto.randomUUID();
  const headers: Record<string, string> = { "x-request-id": requestId };
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const matched = [...routes]
    .sort((left, right) => left.path.split(":").length - right.path.split(":").length)
    .map((item) => ({ route: item, params: matchPath(item.path, url.pathname) }))
    .find((entry) => entry.route.method === method && entry.params !== null);
  if (!matched)
    return {
      status: 404,
      body: {
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Endpoint not found.",
          requestId,
        },
      },
      headers,
    };
  const { route: definition } = matched;
  try {
    if (method !== "GET") checkOrigin(request);
    const session = await loadSession(request);
    if (definition.access !== "PUBLIC") {
      invariant(session, 401, "AUTHENTICATION_REQUIRED", "Please sign in to continue.");
      if (session.user.mustChangePassword && !url.pathname.startsWith("/api/v1/auth/")) {
        throw new AppError(
          403,
          "FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED",
          "Please change your temporary password.",
        );
      }
      if (definition.access === "HR")
        invariant(
          session.user.role === "HR_ADMIN",
          403,
          "PERMISSION_DENIED",
          "You cannot perform this action.",
        );
      if (definition.access === "MANAGER")
        invariant(
          session.user.role === "MANAGER",
          403,
          "PERMISSION_DENIED",
          "You cannot access this team.",
        );
      if (method !== "GET") checkCsrf(request, session.id);
    }
    let body: unknown = undefined;
    if (method !== "GET") {
      invariant(
        (request.headers.get("content-type") ?? "").includes("application/json"),
        400,
        "INVALID_CONTENT_TYPE",
        "JSON request body required.",
      );
      try {
        body = await request.json();
      } catch {
        throw new AppError(400, "INVALID_INPUT", "Malformed JSON.");
      }
    }
    const ctx: Context = {
      request,
      params: matched.params!,
      query: url.searchParams,
      body,
      session,
      headers,
      requestId,
    };
    if (definition.idempotent && session) {
      const key = request.headers.get("idempotency-key");
      invariant(
        key && key.length >= 8 && key.length <= 150,
        422,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Please retry with a valid Idempotency-Key header.",
      );
      const fingerprint = createHash("sha256").update(JSON.stringify(body)).digest("hex");
      const operation = `${method}:${definition.path}`;
      const existing = await db.idempotencyRecord.findUnique({
        where: { actorId_operation_key: { actorId: session.userId, operation, key } },
      });
      if (existing) {
        invariant(
          existing.fingerprint === fingerprint,
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "This request key has been used for another operation.",
        );
        invariant(
          existing.resultStatus === "DONE",
          409,
          "OPERATION_IN_PROGRESS",
          "This action is already being processed.",
        );
        return {
          status: 200,
          headers,
          body: { data: { id: existing.resourceId, replayed: true }, meta: { requestId } },
        };
      }
      await db.idempotencyRecord.create({
        data: {
          actorId: session.userId,
          operation,
          key,
          fingerprint,
          resultStatus: "PROCESSING",
          expiresAt: new Date(Date.now() + 24 * 3600_000),
        },
      });
      try {
        const data = await definition.handler(ctx);
        const resourceId =
          typeof data === "object" && data !== null && "id" in data ? String(data.id) : null;
        await db.idempotencyRecord.update({
          where: {
            actorId_operation_key: { actorId: session.userId, operation, key },
          },
          data: { resultStatus: "DONE", resourceId },
        });
        return {
          status: method === "POST" ? 201 : 200,
          headers,
          body: { data, meta: { requestId } },
        };
      } catch (error) {
        await db.idempotencyRecord.deleteMany({
          where: {
            actorId: session.userId,
            operation,
            key,
            resultStatus: "PROCESSING",
          },
        });
        throw error;
      }
    }
    const data = await definition.handler(ctx);
    return {
      status: method === "POST" && !url.pathname.endsWith("/login") ? 200 : 200,
      headers,
      body: { data, meta: { requestId } },
    };
  } catch (error) {
    return { ...failure(error, requestId), headers };
  }
}

export function actor(ctx: Context) {
  invariant(ctx.session, 401, "AUTHENTICATION_REQUIRED", "Please sign in.");
  return ctx.session;
}
