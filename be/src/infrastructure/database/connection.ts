import { Pool } from "pg";

let pool: Pool | undefined;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database readiness.");
  }

  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 1_500,
    max: 3,
  });

  return pool;
}

export async function checkDatabase(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  if (!pool) return;

  const active = pool;
  pool = undefined;
  await active.end();
}
