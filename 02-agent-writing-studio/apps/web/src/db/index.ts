import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[db] DATABASE_URL is not set. Database operations will fail until configured.",
  );
}

const client = connectionString
  ? postgres(connectionString, { max: 10 })
  : null;

export const db = client ? drizzle(client, { schema }) : null;

export type Db = NonNullable<typeof db>;

export function requireDb(): Db {
  if (!db) {
    throw new Error("Database not configured. Set DATABASE_URL in .env.local");
  }
  return db;
}
