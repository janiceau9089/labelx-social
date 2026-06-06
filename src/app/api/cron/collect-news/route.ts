// Scheduled by Vercel Cron (see vercel.json). Pulls last-24h news into Firestore.
// Protected by CRON_SECRET so only Vercel (or you) can trigger it.
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { collectFromSources } from "@/lib/news";
import type { NewsSource } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization") || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const snap = await adminDb.collection("config").doc("sources").collection("items").get();
  const sources = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NewsSource[];

  const articles = await collectFromSources(sources);

  // Replace the cache with the fresh batch.
  const batch = adminDb.batch();
  const existing = await adminDb.collection("articleCandidates").get();
  existing.docs.forEach((d) => batch.delete(d.ref));
  articles.forEach((a) => batch.set(adminDb.collection("articleCandidates").doc(a.id), a));
  await batch.commit();

  return NextResponse.json({ ok: true, count: articles.length });
}
