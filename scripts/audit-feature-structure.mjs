import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

for (const directory of ["fe", "be", "packages/contracts"]) {
  if (!existsSync(join(root, directory, "package.json"))) {
    failures.push(`Missing workspace: ${directory}`);
  }
}

if (existsSync(join(root, "apps"))) {
  failures.push("Legacy apps/ workspace must not exist; use fe/ and be/.");
}

const featureRoot = join(root, "be/src/features");
for (const feature of readdirSync(featureRoot, { withFileTypes: true })) {
  if (!feature.isDirectory()) continue;
  const handlerDir = join(featureRoot, feature.name, "handler");
  if (!existsSync(handlerDir)) continue;

  for (const item of readdirSync(handlerDir)) {
    if (!item.endsWith(".ts")) continue;
    const source = readFileSync(join(handlerDir, item), "utf8");
    if (/from\s+["'][^"']*database\/client["']/.test(source)) {
      failures.push(`HTTP handler accesses database directly: ${feature.name}/${item}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.info("audit:features OK — fe/be workspaces and handler boundaries verified.");
}
