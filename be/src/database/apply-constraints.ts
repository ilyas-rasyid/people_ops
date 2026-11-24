import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

if (process.env.APP_ENV === "production") {
  throw new Error("Review and apply constraint changes through versioned production migrations.");
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required.");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(
    readFileSync(resolve(import.meta.dir, "../../prisma/extra-constraints.sql"), "utf8"),
  );
  console.info("Additional PostgreSQL constraints applied to the local development database.");
} finally {
  await client.end();
}
