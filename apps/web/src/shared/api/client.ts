let csrfToken: string | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    idempotent?: boolean;
  } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  if (method !== "GET" && !path.endsWith("/auth/login")) {
    if (!csrfToken) {
      const response = await fetch("/api/v1/auth/csrf", { credentials: "include" });
      if (response.ok) {
        const payload = await response.json();
        csrfToken = payload.data.token;
      }
    }
  }
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(method !== "GET" ? { "content-type": "application/json" } : {}),
      ...(csrfToken && method !== "GET" ? { "x-csrf-token": csrfToken } : {}),
      ...(options.idempotent ? { "idempotency-key": crypto.randomUUID() } : {}),
    },
    ...(method !== "GET" ? { body: JSON.stringify(options.body ?? {}) } : {}),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (response.status === 401) csrfToken = null;
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
      payload?.error?.message ?? `Request failed (${response.status}).`,
    );
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  return result.data as T;
}

export function resetCsrf() {
  csrfToken = null;
}
