import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const envPath = existsSync(resolve(process.cwd(), ".env"))
  ? resolve(process.cwd(), ".env")
  : resolve(__dirname, "../.env");
config({ path: envPath });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
