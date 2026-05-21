import { NextRequest, NextResponse } from "next/server";
import { listArticles } from "@/lib/rss/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const filter = searchParams.get("filter");
  const source = searchParams.get("source");

  const result = await listArticles({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 20,
    filter: filter === "unread" || filter === "bookmarked" || filter === "read_later" ? filter : undefined,
    sourceId: source ? Number(source) : undefined
  });

  return NextResponse.json(result);
}
