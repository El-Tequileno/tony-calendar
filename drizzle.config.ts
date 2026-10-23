import * as nextEnv from "@next/env";
const envModule = nextEnv as typeof nextEnv & { default?: typeof nextEnv };
const { loadEnvConfig } = envModule.default ?? envModule;
import { defineConfig } from "drizzle-kit";
loadEnvConfig(process.cwd());
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://placeholder:placeholder@localhost/tony_calendar",
  },
});
