import { Elysia } from "elysia";
import { errorResponse, successResponse } from "@peopleops/contracts";

export type HealthDependencies = {
  checkDatabase: () => Promise<boolean>;
};

export function createHealthHandler({ checkDatabase }: HealthDependencies) {
  return new Elysia()
    .get("/api/v1/health/live", ({ set }) => {
      const requestId = crypto.randomUUID();
      set.headers["x-request-id"] = requestId;

      return successResponse({ status: "live" }, requestId);
    })
    .get("/api/v1/health/ready", async ({ set }) => {
      const requestId = crypto.randomUUID();
      set.headers["x-request-id"] = requestId;

      if (!(await checkDatabase())) {
        set.status = 503;
        return errorResponse("SERVICE_UNAVAILABLE", "Service unavailable.", requestId);
      }

      return successResponse({ status: "ready" }, requestId);
    });
}
