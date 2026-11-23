export function assertSafeTestDatabase({ testUrl, devUrl }) {
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL must be explicitly configured.");
  }

  const parsed = new URL(testUrl);
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));

  if (name !== "peopleops_test") {
    throw new Error("Refusing tests outside the peopleops_test database.");
  }

  if (!/^(127\.0\.0\.1|localhost)$/.test(parsed.hostname) && process.env.CI !== "true") {
    throw new Error("Test database must be local unless running in CI.");
  }

  if (devUrl && new URL(devUrl).href === parsed.href) {
    throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL.");
  }

  return name;
}
