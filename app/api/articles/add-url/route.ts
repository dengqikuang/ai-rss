import { NextRequest, NextResponse } from "next/server";
import { addArticleByUrl } from "@/lib/rss/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { url, sourceName } = (await request.json()) as {
      url?: string;
      sourceName?: string;
    };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "缺少有效的 URL" }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "URL 格式不合法" }, { status: 400 });
    }

    const article = await addArticleByUrl(url, sourceName);

    return NextResponse.json(article);
  } catch (error) {
    console.error("add-url error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "添加失败" },
      { status: 500 }
    );
  }
}
