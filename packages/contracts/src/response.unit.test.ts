import { describe, expect, it } from "vitest";
import { errorResponse, successResponse } from "./response";

describe("API response envelopes", () => {
  it("uses the shared successful data shape", () => {
    expect(successResponse({ status: "live" }, "req-001")).toEqual({
      data: { status: "live" },
      meta: { requestId: "req-001" },
    });
  });

  it("returns safe error data", () => {
    expect(errorResponse("SERVICE_UNAVAILABLE", "Service unavailable.", "req-002")).toEqual({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Service unavailable.",
        requestId: "req-002",
      },
    });
  });
});
