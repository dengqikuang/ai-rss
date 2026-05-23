import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/migrate";
import { sources } from "@/lib/db/schema";
import { inspectFeed, listSources } from "@/lib/rss/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listSources();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  await ensureDatabase();
  const body = (await request.json()) as {
    name?: string;
    url?: string;
    feedUrl?: string;
    feed_url?: string;
    description?: string;
    iconUrl?: string;
  };

  const providedFeedUrl = body.feedUrl ?? body.feed_url;
  if (!providedFeedUrl) {
    return NextResponse.json({ error: "请填写 RSS Feed 地址" }, { status: 400 });
  }

  let inspected;
  try {
    inspected = await inspectFeed(providedFeedUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "无法解析 RSS Feed" },
      { status: 422 }
    );
  }

  const values = {
    name: body.name?.trim() || inspected.name,
    url: body.url?.trim() || inspected.url,
    feedUrl: inspected.feedUrl,
    description: body.description?.trim() || inspected.description,
    iconUrl: body.iconUrl?.trim() || inspected.iconUrl
  };

  await db.insert(sources).values(values).onConflictDoNothing({ target: sources.feedUrl });
  const [source] = await db.select().from(sources).where(eq(sources.feedUrl, values.feedUrl)).limit(1);

  return NextResponse.json(source, { status: 201 });
}
