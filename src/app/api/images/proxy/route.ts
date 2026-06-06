// Image proxy: fetches an external image server-side and streams it back from
// our own origin, so the browser can draw it on a canvas and still export the
// PNG (cross-origin images would otherwise "taint" the canvas). Auth-gated.
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try { await requireUser(req); } catch (r) { return r as Response; }
  const raw = new URL(req.url).searchParams.get("url") || "";
  if (!/^https?:\/\//i.test(raw)) return new Response("Bad url", { status: 400 });
  let u: URL;
  try { u = new URL(raw); } catch { return new Response("Bad url", { status: 400 }); }
  try {
    const res = await fetch(raw, {
      // Send a Referer of the image's own host — bypasses most hotlink protection.
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "Referer": u.origin + "/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return new Response("Upstream " + res.status, { status: 502 });
    let type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) {
      const ext = (u.pathname.match(/\.(jpe?g|png|webp|gif)(?=$|\?)/i) || [])[1];
      if (ext) type = "image/" + (ext.toLowerCase() === "jpg" ? "jpeg" : ext.toLowerCase());
      else return new Response("Not an image (" + (type || "?") + ")", { status: 415 });
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 200) return new Response("Empty", { status: 415 });
    if (buf.byteLength > 8 * 1024 * 1024) return new Response("Too large", { status: 413 });
    return new Response(buf, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    return new Response("Fetch failed: " + (e as Error).message, { status: 502 });
  }
}
