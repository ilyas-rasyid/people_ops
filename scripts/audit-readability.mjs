import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const directories = ["fe/src", "be/src", "packages/contracts/src"];
const ignored = new Set(["generated", "node_modules", "dist", "coverage"]);
const extensions = new Set([".ts", ".tsx", ".css"]);
const failures = [];
const maxLineLength = 120;

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(file);
      continue;
    }

    if (!extensions.has(extname(entry.name))) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      if (line.length > maxLineLength) {
        failures.push(`${relative(root, file)}:${index + 1} — ${line.length} characters`);
      }
    }
  }
}

for (const directory of directories) walk(join(root, directory));

if (failures.length > 0) {
  console.error(`Long handwritten source lines:\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.info(`audit:readability OK — no lines over ${maxLineLength} characters.`);
}
