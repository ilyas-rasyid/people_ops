import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error("TEST_DATABASE_URL is required for integration tests.");
}

const pool = new Pool({ connectionString, connectionTimeoutMillis: 1_500 });

afterAll(async () => {
  await pool.end();
});

describe("PostgreSQL integration foundation", () => {
  it("connects to the isolated test database", async () => {
    const result = await pool.query<{ databaseName: string }>(
      'SELECT current_database() AS "databaseName"',
    );

    expect(result.rows[0]?.databaseName).toBe("peopleops_test");
  });

  it("has applied the disposable migration fixture", async () => {
    const result = await pool.query<{ name: string | null }>(
      `SELECT to_regclass('public."M0MigrationProbe"')::text AS name`,
    );

    expect(result.rows[0]?.name).toBeTruthy();
  });
});
