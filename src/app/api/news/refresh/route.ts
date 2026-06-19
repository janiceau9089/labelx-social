// /api/news/refresh — lets a signed-in user manually trigger a fresh news
// collection pass (same logic as the daily cron in
// /api/cron/collect-news), instead of waiting for the next scheduled run.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { collectFromSources } from "@/lib/news";
import type { NewsSource } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try { await requireUser(req); } catch (r) { return r as Response; }

  const snap = await adminDb.collection("config").doc("sources").collection("items").get();
  const sources = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NewsSource[];

  const articles = await collectFromSources(sources);

  const batch = adminDb.batch();
  const existing = await adminDb.collection("articleCandidates").get();
  existing.docs.forEach((d) => batch.delete(d.ref));
  articles.forEach((a) => batch.set(adminDb.collection("articleCandidates").doc(a.id), a));
  await batch.commit();

  return NextResponse.json({ ok: true, count: articles.length });
}
