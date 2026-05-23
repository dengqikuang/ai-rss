import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient(
  url.startsWith("file:") || url.startsWith("libsql:") || url.startsWith("http")
    ? { url, authToken }
    : { url: `file:${url}` }
);

export const db = drizzle(client, { schema });
