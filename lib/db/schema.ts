import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sources = sqliteTable(
  "sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    feedUrl: text("feed_url").notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
  },
  (table) => ({
    feedUrlIdx: uniqueIndex("sources_feed_url_unique").on(table.feedUrl)
  })
);

export const articles = sqliteTable(
  "articles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    author: text("author"),
    content: text("content"),
    summary: text("summary"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    // AI pipeline fields
    isRelevant: integer("is_relevant"),
    relevanceScore: integer("relevance_score"),
    aiSummary: text("ai_summary"),
    aiCategory: text("ai_category"),
    rawHtml: text("raw_html"),
    fetchStatus: text("fetch_status").notNull().default("pending")
  },
  (table) => ({
    urlIdx: uniqueIndex("articles_url_unique").on(table.url)
  })
);

export const readingState = sqliteTable("reading_state", {
  articleId: integer("article_id")
    .primaryKey()
    .references(() => articles.id, { onDelete: "cascade" }),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  isBookmarked: integer("is_bookmarked", { mode: "boolean" }).notNull().default(false),
  readLater: integer("read_later", { mode: "boolean" }).notNull().default(false),
  readAt: integer("read_at", { mode: "timestamp" }),
  notes: text("notes")
});

export const sourcesRelations = relations(sources, ({ many }) => ({
  articles: many(articles)
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  source: one(sources, {
    fields: [articles.sourceId],
    references: [sources.id]
  }),
  readingState: one(readingState, {
    fields: [articles.id],
    references: [readingState.articleId]
  })
}));

export const readingStateRelations = relations(readingState, ({ one }) => ({
  article: one(articles, {
    fields: [readingState.articleId],
    references: [articles.id]
  })
}));

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ReadingState = typeof readingState.$inferSelect;
