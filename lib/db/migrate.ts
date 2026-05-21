import { sql } from "drizzle-orm";
import { db } from "./index";

let migrated = false;

export function ensureDatabase() {
  if (migrated) {
    return;
  }

  db.run(sql`
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
  db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS sources_feed_url_unique ON sources(feed_url)`);

  db.run(sql`
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
  db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS articles_url_unique ON articles(url)`);

  db.run(sql`
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
