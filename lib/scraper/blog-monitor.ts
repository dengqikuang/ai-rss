/**
 * Blog page monitor — periodically checks a blog listing page for new article links.
 * For sites that don't have RSS feeds (e.g., claude.com/blog).
 */

import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { scrapeContent } from "./index";
import { plainText } from "@/lib/utils";
import { checkRelevance, generateReadingNote } from "@/lib/ai";
import { getManualSourceId } from "@/lib/db/migrate";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface BlogSource {
  name: string; // display name
  listUrl: string; // the blog listing page
  linkPattern: string; // CSS selector or regex to match article links
  baseUrl: string; // prefix for relative links
}

const BLOG_SOURCES: BlogSource[] = [
  {
    name: "Anthropic Blog",
    listUrl: "https://claude.com/blog",
    linkPattern: '/blog/',
    baseUrl: "https://claude.com"
  }
];

/**
 * Fetch a listing page and extract article URLs.
 */
async function getArticleLinks(source: BlogSource): Promise<string[]> {
  const res = await fetch(source.listUrl, {
    headers: { "User-Agent": USER_AGENT }
  });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);

  const links = new Set<string>();
  $(`a[href*="${source.linkPattern}"]`).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    // Filter out category/tag pages
    if (/\/(category|tag|author|page)\//.test(href)) return;

    const fullUrl = href.startsWith("http") ? href : source.baseUrl + href;
    links.add(fullUrl);
  });

  return [...links];
}

/**
 * Process a single new blog article through the full pipeline.
 */
async function processBlogArticle(url: string, sourceName: string) {
  // Check if already exists
  const [existing] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.url, url))
    .limit(1);

  if (existing) return null;

  // Scrape content
  const rawHtml = await scrapeContent(url);
  if (!rawHtml) return null;

  const $ = cheerio.load(rawHtml);
  const title = $("title").text().trim() || $("h1").first().text().trim() || url;
  const textContent = $.text().trim();
  const summary = plainText(textContent, 300);

  // AI relevance check + reading note
  const relevance = await checkRelevance(title, summary);
  if (!relevance.relevant) {
    // Still insert as skipped (user can find in "全部来源")
    await db.insert(articles).values({
      sourceId: getManualSourceId(),
      title,
      url,
      author: sourceName,
      content: rawHtml,
      summary,
      rawHtml,
      isRelevant: 0,
      relevanceScore: relevance.score,
      fetchStatus: "skipped"
    }).onConflictDoNothing({ target: articles.url });
    return null;
  }

  // Generate reading note
  const reading = await generateReadingNote(title, textContent);

  await db.insert(articles).values({
    sourceId: getManualSourceId(),
    title,
    url,
    author: sourceName,
    content: rawHtml,
    summary,
    rawHtml,
    isRelevant: 1,
    relevanceScore: relevance.score,
    aiSummary: reading.summary,
    aiCategory: reading.category,
    fetchStatus: "done"
  }).onConflictDoNothing({ target: articles.url });

  return { title, category: reading.category };
}

/**
 * Check all monitored blog listing pages for new articles.
 * Called from fetchAllSources() after RSS fetching.
 */
export async function monitorBlogs(): Promise<{ name: string; added: number }[]> {
  const results: { name: string; added: number }[] = [];

  for (const source of BLOG_SOURCES) {
    try {
      const links = await getArticleLinks(source);
      let added = 0;

      for (const url of links) {
        const result = await processBlogArticle(url, source.name);
        if (result) added++;
      }

      results.push({ name: source.name, added });
    } catch {
      results.push({ name: source.name, added: 0 });
    }
  }

  return results;
}
