// /api/admin/channels — GET (list), POST (create), PUT (update), DELETE
// All writes are guarded by isAdmin(). Reads are open to any authenticated user.
import { NextResponse } from "next/server";
import { requireUser, isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { withFreshLogoUrls } from "@/lib/logoUrls";

export const dynamic = "force-dynamic";

const col = () => adminDb.collection("config").doc("channels").collection("items");

// logoUrl is always a signed, time-limited URL — never persist it. Only
// logoPath (the stable Storage object path) belongs in Firestore; logoUrl
// is regenerated fresh on every GET via withFreshLogoUrls().
function stripTransientLogoUrl<T extends { logoUrl?: unknown }>(body: T): Omit<T, "logoUrl"> {
  const { logoUrl, ...rest } = body;
  return rest;
}

export async function GET(req: Request) {
  try { await requireUser(req); } catch (r) { return r as Response; }
  const snap = await col().get();
  const channels = await withFreshLogoUrls(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  return NextResponse.json({ channels });
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(req); } catch (r) { return r as Response; }
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });
  const body = await req.json();
  if (!body.id || !body.name) return NextResponse.json({ error: "id and name required" }, { status: 400 });
  await col().doc(body.id).set(stripTransientLogoUrl(body));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  let user;
  try { user = await requireUser(req); } catch (r) { return r as Response; }
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await col().doc(body.id).set(stripTransientLogoUrl(body), { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  let user;
  try { user = await requireUser(req); } catch (r) { return r as Response; }
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await col().doc(id).delete();
  return NextResponse.json({ ok: true });
}
