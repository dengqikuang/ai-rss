import { NextResponse } from "next/server";
import { fetchAllSources } from "@/lib/rss/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await fetchAllSources();
  return NextResponse.json(result);
}
