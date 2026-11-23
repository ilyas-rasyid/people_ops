import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { auditFileLength } from "../lib/file-audit.mjs";
import { assertSafeTestDatabase } from "../lib/test-db-guard.mjs";

test("file audit detects a 351-line handwritten source", () => {
  const directory = mkdtempSync(join(tmpdir(), "peopleops-audit-"));

  try {
    mkdirSync(join(directory, "src"));
    writeFileSync(join(directory, "src", "large.ts"), "const ok = true;\n".repeat(351));
    const result = auditFileLength(directory);

    assert.equal(result.violations.length, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("test database guard allows only peopleops_test", () => {
  const testUrl = "postgresql://user:pass@localhost:5433/peopleops_test";
  const devUrl = "postgresql://user:pass@localhost:5433/peopleops_dev";

  assert.equal(assertSafeTestDatabase({ testUrl, devUrl }), "peopleops_test");
  assert.throws(() => assertSafeTestDatabase({ testUrl: devUrl }));
});
