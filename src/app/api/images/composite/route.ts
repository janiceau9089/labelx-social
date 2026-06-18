// /api/images/composite — server-side equivalent of the client canvas
// drawCover() logic. Not called by any UI yet; this is the foundation for
// Phase 2 (automated Meta publishing), where the post image needs to be
// generated without a browser. Auth-gated like every other image route.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { compositeCover } from "@/lib/imageComposite";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};
const MAX_FETCH_BYTES = 8 * 1024 * 1024;

async function fetchImageBytes(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_FETCH_BYTES) throw new Error("Image too large");
  return Buffer.from(buf);
}

export async function POST(req: Request) {
  try { await requireUser(req); } catch (r) { return r as Response; }

  const body = await req.json();
  const {
    imageUrl, offsetX, offsetY, zoom,
    frameColor, title, titleSize, titleColor,
    logoUrl, logoShape, sourceLabel,
  } = body || {};

  if (!frameColor || !titleSize || !titleColor || !sourceLabel) {
    return NextResponse.json({ error: "frameColor, titleSize, titleColor, sourceLabel are required" }, { status: 400 });
  }
  if (!["s", "m", "l"].includes(titleSize)) return NextResponse.json({ error: "titleSize must be s|m|l" }, { status: 400 });
  if (titleColor !== "#ffffff" && titleColor !== "#000000") return NextResponse.json({ error: "titleColor must be #ffffff or #000000" }, { status: 400 });

  try {
    const [imageBuffer, logoBuffer] = await Promise.all([
      imageUrl ? fetchImageBytes(imageUrl) : Promise.resolve(undefined),
      logoUrl ? fetchImageBytes(logoUrl) : Promise.resolve(undefined),
    ]);

    const png = await compositeCover({
      imageBuffer,
      offsetX: typeof offsetX === "number" ? offsetX : 0,
      offsetY: typeof offsetY === "number" ? offsetY : 0,
      zoom: typeof zoom === "number" ? zoom : 1,
      frameColor,
      title: title || "Title",
      titleSize,
      titleColor,
      logoBuffer,
      logoShape: logoShape === "circle" ? "circle" : "rounded",
      sourceLabel,
    });

    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Composite failed" }, { status: 500 });
  }
}
