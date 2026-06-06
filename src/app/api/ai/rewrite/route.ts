import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rewrite } from "@/lib/ai";
import { adminDb } from "@/lib/firebaseAdmin";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireUser(req);
  } catch (r) {
    return r as Response;
  }
  const { channelId, summary, keyFacts, source, artistHint } = (await req.json()) || {};
  if (!channelId || !summary) {
    return NextResponse.json({ error: "Missing channelId/summary" }, { status: 400 });
  }

  const doc = await adminDb.collection("config").doc("channels").collection("items").doc(channelId).get();
  if (!doc.exists) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  const channel = { id: doc.id, ...doc.data() } as Channel;

  try {
    const result = await rewrite({
      channel,
      summary,
      keyFacts: keyFacts || [],
      source: source || "",
      artistHint,
    });
    return NextResponse.json({
      ...result,
      hashtagsLocked: channel.tags || [],
      cta: channel.cta || "",
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
