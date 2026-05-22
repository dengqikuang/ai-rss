/**
 * Content scraper — fetches full article HTML from a URL.
 * Uses cheerio (already in deps) to extract the main content area.
 */

import * as cheerio from "cheerio";

const TIMEOUT = 15000;
const MAX_CONTENT_LENGTH = 50000;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Try to fetch and extract the main article content from a URL.
 * Returns cleaned HTML string or null if scraping fails.
 */
export async function scrapeContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal,
      redirect: "follow"
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noise elements
    $(
      "script, style, nav, header, footer, iframe, noscript, " +
      "aside, .sidebar, .nav, .navigation, .menu, " +
      ".comments, .comment-section, #comments, " +
      ".social-share, .share, .related-posts, " +
      ".advertisement, .ads, .ad, " +
      ".cookie-banner, .popup, .modal"
    ).remove();

    // Try common content selectors, fallback to body
    const contentSelectors = [
      "article",
      '[role="main"]',
      "main",
      ".post-content",
      ".article-content",
      ".content",
      ".entry-content",
      ".post-body",
      "#content",
      ".prose",
      ".markdown-body"
    ];

    let contentHtml = "";
    for (const selector of contentSelectors) {
      const el = $(selector).first();
      if (el.length && el.text().trim().length > 200) {
        el.find("a").each((_, a) => {
          const href = $(a).attr("href");
          if (href) {
            $(a).attr("target", "_blank");
            $(a).attr("rel", "noopener noreferrer");
          }
        });
        contentHtml = el.html() ?? "";
        break;
      }
    }

    if (!contentHtml) {
      // Fallback: use body
      $("body").find("a").each((_, a) => {
        const href = $(a).attr("href");
        if (href) {
          $(a).attr("target", "_blank");
          $(a).attr("rel", "noopener noreferrer");
        }
      });
      contentHtml = $("body").html() ?? "";
    }
    const truncated = contentHtml.slice(0, MAX_CONTENT_LENGTH);

    if (truncated.trim().length < 100) return null;

    return truncated;
  } catch {
    return null;
  }
}
