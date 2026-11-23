import type { ApiErrorCode, ApiFailure, ApiSuccess } from "./types";

export function successResponse<T>(data: T, requestId: string): ApiSuccess<T> {
  return { data, meta: { requestId } };
}

export function errorResponse(code: ApiErrorCode, message: string, requestId: string): ApiFailure {
  return { error: { code, message, requestId } };
}
