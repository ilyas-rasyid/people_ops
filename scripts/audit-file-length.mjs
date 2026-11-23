import { auditFileLength } from "./lib/file-audit.mjs";

const result = auditFileLength(process.cwd());

if (result.violations.length > 0) {
  console.error("Handwritten source files exceed 350 lines:");
  console.error(result.violations.join("\n"));
  process.exitCode = 1;
} else {
  console.info(`audit:files OK — checked ${result.totalFiles} source files.`);
}
