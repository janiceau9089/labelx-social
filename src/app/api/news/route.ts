// Returns the current ranked news cache + the channel list for the workflow UI.
import { NextResponse } from "next/server";
import { requireUser, isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser(req);
  } catch (r) {
    return r as Response;
  }
  const [news, channels] = await Promise.all([
    adminDb.collection("articleCandidates").orderBy("score", "desc").limit(50).get(),
    adminDb.collection("config").doc("channels").collection("items").get(),
  ]);
  return NextResponse.json({
    isAdmin: isAdmin(user.email),
    news: news.docs.map((d) => d.data()),
    channels: channels.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
}
