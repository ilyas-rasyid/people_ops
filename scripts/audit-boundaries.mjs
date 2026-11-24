import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const failures = [];
const excluded = new Set(["node_modules", "generated", "dist", "coverage", ".git"]);
const extensions = new Set([".ts", ".tsx", ".js", ".mjs"]);

const checks = [
  { prefix: "fe/", patterns: [/be\//, /@prisma\//, /from\s+["']pg["']/] },
  { prefix: "be/", patterns: [/fe\//, /from\s+["']react["']/] },
  {
    prefix: "packages/contracts/",
    patterns: [/apps\/(web|api|fe|be)\//, /@prisma\//, /from\s+["'](pg|elysia|react)["']/],
  },
];

function walk(directory) {
  if (!existsSync(directory)) return;

  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(item.name)) continue;

    const absolute = join(directory, item.name);

    if (item.isDirectory()) {
      walk(absolute);
    } else if (item.isFile() && extensions.has(extname(item.name))) {
      const name = relative(root, absolute).replaceAll("\\", "/");
      const source = readFileSync(absolute, "utf8");
      const policy = checks.find(({ prefix }) => name.startsWith(prefix));

      if (policy && policy.patterns.some((pattern) => pattern.test(source))) {
        failures.push(name);
      }
    }
  }
}

walk(join(root, "be"));
walk(join(root, "fe"));
walk(join(root, "packages"));

if (failures.length > 0) {
  console.error(`Forbidden cross-workspace imports:\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.info("audit:boundaries OK — no forbidden cross-workspace imports.");
}
