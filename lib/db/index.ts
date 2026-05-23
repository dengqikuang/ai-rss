import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
const isLocal = !url.startsWith("libsql:") && !url.startsWith("http");

const client: Client = isLocal
  ? createClient({ url: url.startsWith("file:") ? url : `file:${url}` })
  : createClient({ url, authToken });

// Local SQLite needs this pragma for ON DELETE CASCADE to work.
// Turso enforces foreign keys by default.
const localInit = isLocal ? client.execute("PRAGMA foreign_keys = ON").then(() => {}) : Promise.resolve();

export const db = drizzle(client, { schema });
export { localInit };
