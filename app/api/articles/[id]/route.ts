import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/migrate";
import { readingState } from "@/lib/db/schema";
import { articleExists, getArticle } from "@/lib/rss/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function idFromParams(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const id = idFromParams(params);
  if (!id) {
    return NextResponse.json({ error: "无效的文章 ID" }, { status: 400 });
  }

  const article = await getArticle(id);
  if (!article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  ensureDatabase();
  const id = idFromParams(params);
  if (!id) {
    return NextResponse.json({ error: "无效的文章 ID" }, { status: 400 });
  }

  if (!(await articleExists(id))) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  const body = (await request.json()) as {
    isRead?: boolean;
    isBookmarked?: boolean;
    readLater?: boolean;
    notes?: string | null;
  };

  const state = {
    ...(typeof body.isRead === "boolean" ? { isRead: body.isRead, readAt: body.isRead ? new Date() : null } : {}),
    ...(typeof body.isBookmarked === "boolean" ? { isBookmarked: body.isBookmarked } : {}),
    ...(typeof body.readLater === "boolean" ? { readLater: body.readLater } : {}),
    ...(typeof body.notes === "string" || body.notes === null ? { notes: body.notes } : {})
  };

  if (Object.keys(state).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  await db
    .insert(readingState)
    .values({ articleId: id, ...state })
    .onConflictDoUpdate({
      target: readingState.articleId,
      set: state
    });

  const [updated] = await db.select().from(readingState).where(eq(readingState.articleId, id)).limit(1);
  return NextResponse.json(updated);
}
