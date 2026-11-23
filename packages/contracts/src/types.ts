export type ApiMeta = { requestId: string };

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "RESOURCE_NOT_FOUND"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  requestId: string;
};

export type ApiSuccess<T> = {
  data: T;
  meta: ApiMeta;
};

export type ApiFailure = { error: ApiError };
