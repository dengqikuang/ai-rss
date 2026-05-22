import { and, desc, eq, isNull, isNotNull, lt, max, sql } from "drizzle-orm";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { ensureDatabase, getManualSourceId } from "@/lib/db/migrate";
import { articles, readingState, sources } from "@/lib/db/schema";
import { plainText } from "@/lib/utils";
import { checkRelevance, generateReadingNote } from "@/lib/ai";
import { scrapeContent } from "@/lib/scraper";

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

// ---------- AI Pipeline ----------

/**
 * Process a single article through the AI pipeline:
 * 1. Check relevance (title + summary)
 * 2. If relevant, scrape full content
 * 3. Generate AI reading recommendation
 */
async function processArticleWithAI(articleId: number) {
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return;

  // Mark as checking
  await db
    .update(articles)
    .set({ fetchStatus: "checking" })
    .where(eq(articles.id, articleId));

  const title = article.title || "";
  const summary = article.summary || "";

  try {
    // Step 1: Relevance check
    const relevance = await checkRelevance(title, summary);

    if (!relevance.relevant) {
      await db
        .update(articles)
        .set({
          isRelevant: 0,
          relevanceScore: relevance.score,
          fetchStatus: "skipped"
        })
        .where(eq(articles.id, articleId));
      return;
    }

    // Step 2: Scrape full content
    let rawHtml: string | null = null;
    if (article.url) {
      rawHtml = await scrapeContent(article.url);
    }

    // Step 3: Generate reading note
    const fullText = rawHtml
      ? cheerio.load(rawHtml).text().trim()
      : summary;

    const reading = await generateReadingNote(title, fullText);

    // Save results
    await db
      .update(articles)
      .set({
        isRelevant: 1,
        relevanceScore: relevance.score,
        aiSummary: reading.summary,
        aiCategory: reading.category,
        rawHtml,
        fetchStatus: "done"
      })
      .where(eq(articles.id, articleId));
  } catch (error) {
    await db
      .update(articles)
      .set({
        isRelevant: 1, // on error, default to relevant so the article is visible
        relevanceScore: 50,
        fetchStatus: "error"
      })
      .where(eq(articles.id, articleId));
    throw error;
  }
}

/**
 * Process all newly-fetched articles that haven't gone through AI pipeline yet.
 * Processes in batches to avoid rate limiting.
 */
export async function processPendingArticles() {
  ensureDatabase();
  const pending = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.fetchStatus, "pending"))
    .orderBy(desc(articles.createdAt))
    .limit(20);

  const results: { id: number; ok: boolean; error?: string }[] = [];

  for (const { id } of pending) {
    try {
      await processArticleWithAI(id);
      results.push({ id, ok: true });
    } catch (error) {
      results.push({
        id,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return results;
}

/**
 * Manually add a URL to the reading queue:
 * scrape the page → extract title/content → AI pipeline
 */
export async function addArticleByUrl(url: string, sourceName?: string) {
  ensureDatabase();

  const normalized = normalizeUrl(url);

  // Check if already exists
  const [existing] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.url, normalized))
    .limit(1);

  let articleId: number;

  if (existing) {
    // Re-process existing article
    articleId = existing.id;
    await db
      .update(articles)
      .set({ fetchStatus: "pending" })
      .where(eq(articles.id, articleId));
  } else {
    // Scrape page to get basic info
    let title = normalized;
    let pageContent: string | null = null;

    try {
      const html = await scrapeContent(normalized);
      if (html) {
        pageContent = html;
        const $ = cheerio.load(html);
        title = $("title").text().trim() || $("h1").first().text().trim() || normalized;
      }
    } catch {
      // Use URL as title if scraping fails
    }

    const summary = pageContent
      ? plainText(cheerio.load(pageContent).text().trim(), 300)
      : null;

    // Insert without source_id, use sentinel source for manual articles
    const manualId = getManualSourceId();
    const [inserted] = await db
      .insert(articles)
      .values({
        sourceId: manualId,
        title,
        url: normalized,
        author: sourceName || null,
        content: pageContent,
        summary,
        rawHtml: pageContent,
        fetchStatus: "pending"
      })
      .onConflictDoNothing({ target: articles.url })
      .returning({ id: articles.id });

    if (!inserted) {
      throw new Error("文章已存在");
    }

    articleId = inserted.id;
  }

  // Run AI pipeline immediately
  await processArticleWithAI(articleId);

  return getArticle(articleId);
}

// ---------- Feed Fetching ----------

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
        publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
        fetchStatus: "pending"
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

  // Skip sentinel sources (feed_url starting with "manual://")
  const realSources = allSources.filter((s) => !s.feedUrl.startsWith("manual://"));

  for (const source of realSources) {
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

  // Monitor non-RSS blogs for new articles
  let blogResults: { name: string; added: number }[] = [];
  try {
    const { monitorBlogs } = await import("@/lib/scraper/blog-monitor");
    blogResults = await monitorBlogs();
  } catch {
    // blog monitor is optional
  }

  // Run AI pipeline on newly-fetched articles
  const aiResults = await processPendingArticles();

  return {
    totalInserted: results.reduce((sum, result) => sum + result.inserted, 0),
    results,
    aiProcessed: aiResults.length,
    blogs: blogResults
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

// ---------- List / Query ----------

export async function listArticles(options: {
  page?: number;
  limit?: number;
  filter?: "unread" | "bookmarked" | "read_later" | "ai_relevant" | "all_raw";
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

  // "ai_relevant" is the default view: only show AI-relevant articles
  if (options.filter === "ai_relevant" || !options.filter) {
    predicates.push(eq(articles.isRelevant, 1));
  }

  // "all_raw" shows everything (包括未筛选和不相关的)

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
      sourceName: sql<string>`coalesce(${sources.name}, '手动添加')`,
      sourceIconUrl: sources.iconUrl,
      isRead: sql<boolean>`coalesce(${readingState.isRead}, false)`,
      isBookmarked: sql<boolean>`coalesce(${readingState.isBookmarked}, false)`,
      readLater: sql<boolean>`coalesce(${readingState.readLater}, false)`,
      isRelevant: articles.isRelevant,
      relevanceScore: articles.relevanceScore,
      aiSummary: articles.aiSummary,
      aiCategory: articles.aiCategory,
      fetchStatus: articles.fetchStatus
    })
    .from(articles)
    .leftJoin(sources, eq(articles.sourceId, sources.id))
    .leftJoin(readingState, eq(articles.id, readingState.articleId))
    .where(predicates.length ? and(...predicates) : undefined)
    .orderBy(desc(sql`coalesce(${articles.publishedAt}, ${articles.createdAt})`))
    .limit(limit)
    .offset(offset);

  return {
    page,
    limit,
    items: rows.map((row) => ({
      ...row,
      isRead: Boolean(row.isRead),
      isBookmarked: Boolean(row.isBookmarked),
      readLater: Boolean(row.readLater)
    }))
  };
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
