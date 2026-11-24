import { AppError } from "../commons/errors/app-error";

const events = new Map<string, number[]>();
const WINDOW_MS = 15 * 60_000;
const MAX_LOGIN_ATTEMPTS = 5;

export function guardLoginAttempts(identity: string) {
  const now = Date.now();
  const key = identity.trim().toLowerCase();
  const recent = (events.get(key) ?? []).filter((timestamp) => timestamp > now - WINDOW_MS);
  if (recent.length >= MAX_LOGIN_ATTEMPTS) {
    throw new AppError(429, "RATE_LIMITED", "Too many sign-in attempts. Try again later.");
  }
  events.set(key, recent);
}

export function recordLoginFailure(identity: string) {
  const key = identity.trim().toLowerCase();
  events.set(key, [...(events.get(key) ?? []), Date.now()]);
  if (events.size > 10000) events.clear();
}

export function clearLoginFailures(identity: string) {
  events.delete(identity.trim().toLowerCase());
}
