// /api/admin/channels/logo — uploads a channel logo to Firebase Storage.
// Returns a 7-day signed URL for immediate use; the *path* (not the signed
// URL) is what gets persisted to Firestore, since signed URLs expire. See
// src/lib/logoUrls.ts for how the path is turned back into a fresh signed
// URL on every read (GET /api/news, GET /api/admin/channels).
//
// Why signed URLs instead of public objects: this bucket's Google Cloud
// organization enforces a "Domain Restricted Sharing" policy that blocks
// granting allUsers access (the IAM principal needed for public objects),
// even with Uniform bucket-level access. Signed URLs don't require any IAM
// grant to allUsers — they're scoped, time-limited, and work under that
// policy.
import { NextResponse } from "next/server";
import { requireUser, isAdmin } from "@/lib/auth";
import { adminStorage } from "@/lib/firebaseAdmin";
import { signLogoUrl, LOGO_PREFIX } from "@/lib/logoUrls";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 200 * 1024; // 200KB, matches the client-side limit already enforced in the Admin form
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(req); } catch (r) { return r as Response; }
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  const body = await req.json();
  const { channelId, dataUrl } = body || {};
  if (!channelId || !dataUrl) {
    return NextResponse.json({ error: "channelId and dataUrl required" }, { status: 400 });
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return NextResponse.json({ error: "dataUrl must be a base64 data URL" }, { status: 400 });
  const [, mime, b64] = match;
  if (!ALLOWED_MIME.has(mime)) return NextResponse.json({ error: `Unsupported image type: ${mime}` }, { status: 400 });

  const buffer = Buffer.from(b64, "base64");
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: `Logo must be under ${MAX_BYTES / 1024}KB` }, { status: 400 });
  }

  const ext = mime.split("/")[1].replace("svg+xml", "svg");
  const path = `${LOGO_PREFIX}/${channelId}.${ext}`;
  const bucket = adminStorage.bucket();
  const file = bucket.file(path);

  await file.save(buffer, { metadata: { contentType: mime, cacheControl: "private, max-age=0" } });
  const logoUrl = await signLogoUrl(path);

  // logoPath is the stable identifier persisted to Firestore (via the
  // channel save flow); logoUrl is a freshly-signed, short-lived URL for
  // immediate preview in the Admin form right after upload.
  return NextResponse.json({ ok: true, logoPath: path, logoUrl });
}

export async function DELETE(req: Request) {
  let user;
  try { user = await requireUser(req); } catch (r) { return r as Response; }
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  const bucket = adminStorage.bucket();
  // Try common extensions since we don't store which one was used.
  for (const ext of ["png", "jpg", "jpeg", "webp", "svg"]) {
    const file = bucket.file(`${LOGO_PREFIX}/${channelId}.${ext}`);
    const [exists] = await file.exists();
    if (exists) await file.delete();
  }
  return NextResponse.json({ ok: true });
}
