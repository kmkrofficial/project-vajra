import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: PostgresJsDatabase<typeof schema> | null = null;

/**
 * Get or create the singleton Drizzle database instance.
 * Uses `postgres.js` driver with `prepare: false` (required for serverless-compatible pools).
 * @returns The Drizzle ORM database instance typed with the project schema.
 */
export function getDb() {
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL!, { prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}

/** Lazily initialized on first access — safe during Next.js build. */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as never)[prop];
  },
});
