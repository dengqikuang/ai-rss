import { and, desc, eq, isNull, lt, max, sql } from "drizzle-orm";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/migrate";
import { articles, readingState, sources } from "@/lib/db/schema";
import { plainText } from "@/lib/utils";

type FeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  creator?: string;
  author?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  isoDate?: string;
  pubDate?: string;
};

const parser = new Parser<object, FeedItem>({
  customFields: {
    item: [
      ["content:encoded", "content:encoded"],
      ["dc:creator", "dc:creator"]
    ]
  }
});

function normalizeUrl(url: string) {
  try {
    return new URL(url).toString();
  } catch {
    return url.trim();
  }
}

function resolveUrl(value: string | undefined, base: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function cleanHtml(content: string | undefined) {
  if (!content) {
    return null;
  }

  const $ = cheerio.load(content);
  $("script, style, iframe, noscript").remove();
  $("a").each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      $(element).attr("target", "_blank");
      $(element).attr("rel", "noopener noreferrer");
    }
  });

  return $("body").html() ?? $.root().html() ?? content;
}

function feedTitleFromUrl(feedUrl: string) {
  const url = new URL(feedUrl);
  return url.hostname.replace(/^www\./, "");
}

export async function inspectFeed(feedUrl: string) {
  const normalizedFeedUrl = normalizeUrl(feedUrl);
  const feed = await parser.parseURL(normalizedFeedUrl);
  const siteUrl = resolveUrl(feed.link, normalizedFeedUrl) ?? normalizedFeedUrl;

  return {
    name: feed.title?.trim() || feedTitleFromUrl(normalizedFeedUrl),
    url: siteUrl,
    feedUrl: normalizedFeedUrl,
    description: feed.description?.trim() || null,
    iconUrl: resolveUrl(feed.image?.url, siteUrl)
  };
}

export async function fetchSource(source: typeof sources.$inferSelect) {
  ensureDatabase();
  const feed = await parser.parseURL(source.feedUrl);
  let inserted = 0;

  for (const item of feed.items ?? []) {
    const url = resolveUrl(item.link ?? item.guid, source.url);
    const title = item.title?.trim();

    if (!url || !title) {
      continue;
    }

    const content = cleanHtml((item as any)["content:encoded"] ?? item.content ?? item.summary);
    const summary = item.contentSnippet ?? item.summary ?? plainText(content, 300);
    const publishedAt = item.isoDate || item.pubDate ? new Date(item.isoDate ?? item.pubDate ?? "") : null;

    const result = await db
      .insert(articles)
      .values({
        sourceId: source.id,
        title,
        url,
        author: item.creator ?? (item as any)["dc:creator"] ?? item.author ?? null,
        content,
        summary,
        publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null
      })
      .onConflictDoNothing({ target: articles.url });

    if (result.changes > 0) {
      inserted += result.changes;
    }
  }

  await db
    .update(sources)
    .set({ updatedAt: new Date() })
    .where(eq(sources.id, source.id));

  return inserted;
}

export async function fetchAllSources() {
  ensureDatabase();
  const allSources = await db.select().from(sources).orderBy(sources.name);
  const results = [];

  for (const source of allSources) {
    try {
      const inserted = await fetchSource(source);
      results.push({ sourceId: source.id, name: source.name, inserted, ok: true });
    } catch (error) {
      results.push({
        sourceId: source.id,
        name: source.name,
        inserted: 0,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return {
    totalInserted: results.reduce((sum, result) => sum + result.inserted, 0),
    results
  };
}

export async function fetchIfStale(maxAgeMs = 5 * 60 * 1000) {
  ensureDatabase();
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(sources);
  if (count === 0) {
    return { skipped: true, reason: "no-sources" };
  }

  const [{ latest }] = await db.select({ latest: max(articles.createdAt) }).from(articles);
  if (latest && Date.now() - latest.getTime() < maxAgeMs) {
    return { skipped: true, reason: "fresh" };
  }

  return fetchAllSources();
}

export async function listArticles(options: {
  page?: number;
  limit?: number;
  filter?: "unread" | "bookmarked" | "read_later";
  sourceId?: number;
}) {
  ensureDatabase();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const offset = (page - 1) * limit;
  const predicates = [];

  if (options.sourceId) {
    predicates.push(eq(articles.sourceId, options.sourceId));
  }

  if (options.filter === "unread") {
    predicates.push(sql`(${readingState.isRead} = false OR ${readingState.articleId} IS NULL)`);
  }

  if (options.filter === "bookmarked") {
    predicates.push(eq(readingState.isBookmarked, true));
  }

  if (options.filter === "read_later") {
    predicates.push(eq(readingState.readLater, true));
  }

  const rows = await db
    .select({
      id: articles.id,
      sourceId: articles.sourceId,
      title: articles.title,
      url: articles.url,
      author: articles.author,
      summary: articles.summary,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      sourceName: sources.name,
      sourceIconUrl: sources.iconUrl,
      isRead: sql<boolean>`coalesce(${readingState.isRead}, false)`,
      isBookmarked: sql<boolean>`coalesce(${readingState.isBookmarked}, false)`,
      readLater: sql<boolean>`coalesce(${readingState.readLater}, false)`
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .leftJoin(readingState, eq(articles.id, readingState.articleId))
    .where(predicates.length ? and(...predicates) : undefined)
    .orderBy(desc(sql`coalesce(${articles.publishedAt}, ${articles.createdAt})`))
    .limit(limit)
    .offset(offset);

  return { page, limit, items: rows };
}

export async function getArticle(id: number) {
  ensureDatabase();
  const [article] = await db.query.articles.findMany({
    where: eq(articles.id, id),
    with: {
      source: true,
      readingState: true
    },
    limit: 1
  });

  return article ?? null;
}

export async function markArticleRead(id: number) {
  ensureDatabase();
  const existing = await db.query.readingState.findFirst({
    where: eq(readingState.articleId, id)
  });

  if (existing?.isRead) {
    return;
  }

  await db
    .insert(readingState)
    .values({ articleId: id, isRead: true, readAt: new Date() })
    .onConflictDoUpdate({
      target: readingState.articleId,
      set: { isRead: true, readAt: new Date() }
    });
}

export async function listSources() {
  ensureDatabase();
  return db.select().from(sources).orderBy(sources.name);
}

export async function unreadCountForSource(sourceId: number) {
  ensureDatabase();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .leftJoin(readingState, eq(articles.id, readingState.articleId))
    .where(
      and(
        eq(articles.sourceId, sourceId),
        sql`(${readingState.isRead} = false OR ${readingState.articleId} IS NULL)`
      )
    );

  return count;
}

export async function removeSource(id: number) {
  ensureDatabase();
  await db.delete(sources).where(eq(sources.id, id));
}

export async function articleExists(id: number) {
  ensureDatabase();
  const [row] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);

  return Boolean(row);
}
