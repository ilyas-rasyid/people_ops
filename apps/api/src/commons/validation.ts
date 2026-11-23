import { z } from "zod";
import { AppError } from "./errors/app-error";

export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(
      422,
      "INVALID_INPUT",
      result.error.issues
        .map((issue) => `${issue.path.join(".") || "Request"}: ${issue.message}`)
        .join("; "),
    );
  }
  return result.data;
}

export const uuid = z.uuid();
export const dateOnly = z.iso.date();
export const note = z.string().max(1000).optional();
export const reason = z.string().trim().min(3).max(1000);
export const pageQuery = (query: URLSearchParams) => ({
  page: Math.max(1, Number(query.get("page") || 1) || 1),
  pageSize: Math.min(100, Math.max(1, Number(query.get("pageSize") || 20) || 20)),
});
