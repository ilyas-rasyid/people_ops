import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const excluded = new Set(["node_modules", "dist", "coverage", "generated", ".git"]);
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".css"]);

export function auditFileLength(root, maxLines = 350) {
  const violations = [];
  let totalFiles = 0;

  function visit(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      if (excluded.has(item.name)) continue;

      const absolute = join(directory, item.name);

      if (item.isDirectory()) {
        visit(absolute);
      } else if (item.isFile() && extensions.has(extname(item.name))) {
        totalFiles += 1;
        const content = readFileSync(absolute, "utf8");
        const lines = content.trimEnd().split(/\r?\n/).length;

        if (lines > maxLines) {
          violations.push(`${relative(root, absolute)}: ${lines} lines (max ${maxLines})`);
        }
      }
    }
  }

  visit(root);
  return { totalFiles, violations };
}
