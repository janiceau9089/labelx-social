// Image search via Google Programmable Search (CSE). Returns up to 16 results.
// These are REFERENCE images — rights are not cleared. The UI must label them.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireUser(req);
  } catch (r) {
    return r as Response;
  }
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q) return NextResponse.json({ results: [] });

  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) {
    return NextResponse.json({ error: "Image search not configured" }, { status: 501 });
  }

  const url =
    `https://www.googleapis.com/customsearch/v1?searchType=image&num=10` +
    `&key=${key}&cx=${cx}&q=${encodeURIComponent(q)}`;
  const r1 = await fetch(url);
  const d1 = await r1.json();
  const r2 = await fetch(url + "&start=11");
  const d2 = await r2.json();

  const results = [...(d1.items || []), ...(d2.items || [])]
    .slice(0, 16)
    .map((it: any) => ({ url: it.link, thumb: it.image?.thumbnailLink, source: it.displayLink }));

  return NextResponse.json({ results, note: "reference only — rights not cleared" });
}
