// Returns candidate image URLs found in the quoted article (reference only).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchArticleImages } from "@/lib/news";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  try { await requireUser(req); } catch (r) { return r as Response; }
  const url = new URL(req.url).searchParams.get("url") || "";
  if (!url) return NextResponse.json({ images: [] });
  return NextResponse.json({ images: await fetchArticleImages(url), note: "reference only — rights not cleared" });
}
