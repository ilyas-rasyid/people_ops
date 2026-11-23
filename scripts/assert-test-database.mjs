import { assertSafeTestDatabase } from "./lib/test-db-guard.mjs";

try {
  const name = assertSafeTestDatabase({
    testUrl: process.env.TEST_DATABASE_URL,
    devUrl: process.env.DATABASE_URL,
  });

  console.info(`Test database guard passed: ${name}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown test database error.";
  console.error(message);
  process.exitCode = 1;
}
