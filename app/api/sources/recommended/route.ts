import { NextResponse } from "next/server";
import { recommendedSources } from "@/lib/recommended-sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: recommendedSources });
}
