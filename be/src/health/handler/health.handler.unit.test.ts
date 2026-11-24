import { describe, expect, it } from "vitest";
import { createApp } from "../../app";

describe("health API contract", () => {
  it("responds to liveness independently of the database", async () => {
    const app = createApp({ checkDatabase: async () => false });
    const response = await app.handle(new Request("http://localhost/api/v1/health/live"));
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ data: { status: "live" } });
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns safe error when the database is down", async () => {
    const app = createApp({ checkDatabase: async () => false });
    const response = await app.handle(new Request("http://localhost/api/v1/health/ready"));
    const body: unknown = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ error: { code: "SERVICE_UNAVAILABLE" } });
    expect(JSON.stringify(body)).not.toContain("DATABASE_URL");
  });

  it("responds ready when its database dependency is available", async () => {
    const app = createApp({ checkDatabase: async () => true });
    const response = await app.handle(new Request("http://localhost/api/v1/health/ready"));
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ data: { status: "ready" } });
  });
});
