import { sql } from "drizzle-orm";
import { db } from "./index";

let migrated = false;

export async function ensureDatabase() {
  if (migrated) {
    return;
  }

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS sources (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      name text NOT NULL,
      url text NOT NULL,
      feed_url text NOT NULL,
      description text,
      icon_url text,
      created_at integer DEFAULT (unixepoch()) NOT NULL,
      updated_at integer DEFAULT (unixepoch()) NOT NULL
    )
  `);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS sources_feed_url_unique ON sources(feed_url)`);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS articles (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      source_id integer NOT NULL,
      title text NOT NULL,
      url text NOT NULL,
      author text,
      content text,
      summary text,
      published_at integer,
      created_at integer DEFAULT (unixepoch()) NOT NULL,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE cascade
    )
  `);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS articles_url_unique ON articles(url)`);

  const aiColumns = [
    "ALTER TABLE articles ADD COLUMN is_relevant INTEGER",
    "ALTER TABLE articles ADD COLUMN relevance_score INTEGER",
    "ALTER TABLE articles ADD COLUMN ai_summary TEXT",
    "ALTER TABLE articles ADD COLUMN ai_category TEXT",
    "ALTER TABLE articles ADD COLUMN raw_html TEXT",
    "ALTER TABLE articles ADD COLUMN fetch_status TEXT NOT NULL DEFAULT 'pending'"
  ];
  for (const stmt of aiColumns) {
    try { await db.run(sql.raw(stmt)); } catch { /* column already exists */ }
  }

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS reading_state (
      article_id integer PRIMARY KEY NOT NULL,
      is_read integer DEFAULT false NOT NULL,
      is_bookmarked integer DEFAULT false NOT NULL,
      read_later integer DEFAULT false NOT NULL,
      read_at integer,
      notes text,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE cascade
    )
  `);

  migrated = true;
}

let manualSourceId: number | null = null;

/** Get or create the sentinel source for manually added articles. */
export async function getManualSourceId(): Promise<number> {
  if (manualSourceId !== null) return manualSourceId;

  const rows = await db.all(
    sql`SELECT id FROM sources WHERE feed_url = 'manual://articles' LIMIT 1`
  ) as { id: number }[];

  if (rows.length > 0) {
    manualSourceId = rows[0].id;
  } else {
    await db.run(
      sql`INSERT INTO sources (name, url, feed_url) VALUES ('手动添加', 'manual://articles', 'manual://articles')`
    );
    const inserted = await db.all(
      sql`SELECT id FROM sources WHERE feed_url = 'manual://articles' LIMIT 1`
    ) as { id: number }[];
    manualSourceId = inserted[0].id;
  }

  return manualSourceId;
}
