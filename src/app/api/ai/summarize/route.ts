import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { summarize } from "@/lib/ai";
import { fetchArticleText } from "@/lib/news";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireUser(req);
  } catch (r) {
    return r as Response;
  }
  const body = await req.json();
  const { title, excerpt, source, url } = body || {};
  if (!title || !source) {
    return NextResponse.json({ error: "Missing title/source" }, { status: 400 });
  }
  try {
    const body2 = url ? await fetchArticleText(url) : "";
    const result = await summarize({ title, excerpt: excerpt || "", source, url: url || "", body: body2 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
