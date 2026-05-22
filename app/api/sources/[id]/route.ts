import { NextResponse } from "next/server";
import { removeSource } from "@/lib/rss/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "无效的信源 ID" }, { status: 400 });
  }

  await removeSource(id);
  return NextResponse.json({ ok: true });
}
