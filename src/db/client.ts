import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";
neonConfig.webSocketConstructor = ws;
let database: ReturnType<typeof createDatabase> | undefined;
function createDatabase() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured.");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
  });
  pool.on("error", () => console.error("Database connection failed."));
  return drizzle(pool, { schema });
}
export function db() {
  return (database ??= createDatabase());
}
