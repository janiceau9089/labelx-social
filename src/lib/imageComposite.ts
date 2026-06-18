// Server-side image compositing, mirroring the client canvas logic in
// drawCover() (src/app/workflow/page.tsx) pixel-for-pixel. Not wired into
// any UI yet — this exists so Phase 2 (automated Meta publishing) can
// generate the final post image entirely server-side, without depending on
// a browser canvas. Until Phase 2 ships, the UI continues to export images
// via the client canvas as before; this is purely additive.
import sharp from "sharp";

const SIZE = 540;
const BORDER = 20;

export type CompositeCoverInput = {
  /** Cover photo bytes (already downloaded/fetched). Omit for the placeholder gradient. */
  imageBuffer?: Buffer;
  /** -1..1, matches the client's pan offset semantics. */
  offsetX?: number;
  offsetY?: number;
  /** 1.0 = fit, up to 3.0, matches the client's zoom slider. */
  zoom?: number;
  /** Hex frame color (resolved by the caller — "black" | "premade" | "custom" logic lives client-side). */
  frameColor: string;
  title: string;
  titleSize: "s" | "m" | "l";
  titleColor: "#ffffff" | "#000000";
  /** Channel logo, already downloaded as bytes, or omitted to skip the logo entirely. */
  logoBuffer?: Buffer;
  logoShape: "circle" | "rounded";
  sourceLabel: string;
};

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapTitle(title: string, charsPerLine: number, maxLines = 3): string[] {
  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).length > charsPerLine) { lines.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

/**
 * Composite a single 540x540 post-cover image: background photo (panned +
 * zoomed to match the client preview), frame border, gradient + title, and
 * an optional channel logo badge. Returns a PNG buffer.
 */
export async function compositeCover(input: CompositeCoverInput): Promise<Buffer> {
  const W = SIZE, H = SIZE, b = BORDER;

  // 1. Background layer: either the cover photo (cropped/panned/zoomed to
  //    match the client's cover-fit math) or a placeholder gradient.
  let background: sharp.Sharp;
  if (input.imageBuffer) {
    const img = sharp(input.imageBuffer);
    const meta = await img.metadata();
    const iw = meta.width || W, ih = meta.height || H;
    const base = Math.max(W / iw, H / ih);
    const scale = base * (input.zoom || 1);
    const dw = Math.round(iw * scale), dh = Math.round(ih * scale);
    const maxPanX = Math.max(0, (dw - W) / 2), maxPanY = Math.max(0, (dh - H) / 2);
    const dx = Math.round((W - dw) / 2 + (input.offsetX || 0) * maxPanX);
    const dy = Math.round((H - dh) / 2 + (input.offsetY || 0) * maxPanY);

    const resized = await img.resize(dw, dh).toBuffer();
    // Composite the resized image onto a transparent WxH canvas, cropping
    // to the visible window (negative offsets are clamped to 0 by sharp's
    // extract, so we pad with a transparent base first instead).
    background = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
      .composite([{ input: resized, left: dx, top: dy }]);
  } else {
    const gradientSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2b2b2e" /><stop offset="1" stop-color="#08080a" />
      </linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#g)" />
    </svg>`;
    background = sharp(Buffer.from(gradientSvg));
  }

  // 2. Foreground SVG: frame border, bottom gradient, title text, source label.
  //    Logo is composited separately afterward (raster, not SVG) since it's
  //    an arbitrary uploaded image, not vector content.
  const title = input.title?.trim() || "Title";
  const sizeMap = { s: 21, m: 27, l: 33 } as const;
  const size = sizeMap[input.titleSize];
  const cpl = size <= 21 ? 27 : size >= 33 ? 18 : 22;
  const lines = wrapTitle(title, cpl);
  const lh = size + 7;
  const tc = input.titleColor;
  const strokeColor = tc === "#000000" ? "rgba(255,255,255,.85)" : "rgba(0,0,0,.8)";
  let yy = H - b * 3 - (lines.length - 1) * lh - 16;
  const textSvgLines = lines.map((ln) => {
    const line = `<text x="${W / 2}" y="${yy}" text-anchor="middle" font-family="'Wix Madefor Display',Inter,sans-serif" font-weight="700" font-size="${size}" fill="${tc}" stroke="${strokeColor}" stroke-width="5" paint-order="stroke">${escapeXml(ln)}</text>`;
    yy += lh;
    return line;
  }).join("\n");

  const overlaySvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0,0,0,0)" /><stop offset="1" stop-color="rgba(0,0,0,.62)" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${b}" fill="${input.frameColor}" />
    <rect x="0" y="${H - b * 3}" width="${W}" height="${b * 3}" fill="${input.frameColor}" />
    <rect x="0" y="0" width="${b}" height="${H}" fill="${input.frameColor}" />
    <rect x="${W - b}" y="0" width="${b}" height="${H}" fill="${input.frameColor}" />
    <rect x="0" y="${H - 180}" width="${W}" height="180" fill="url(#fade)" />
    ${textSvgLines}
    <text x="${b + 6}" y="${H - b - 6}" font-family="Inter,sans-serif" font-size="10" fill="rgba(255,255,255,.65)">Nguồn: ${escapeXml(input.sourceLabel)}</text>
  </svg>`;

  let composed = background.composite([{ input: Buffer.from(overlaySvg), left: 0, top: 0 }]);

  // 3. Logo badge (raster), clipped to circle (IG) or rounded square (FB).
  if (input.logoBuffer) {
    const ls = 44, lx = W - b - ls - 10, ly = b + 10;
    const clipPath = input.logoShape === "circle"
      ? `<circle cx="${ls / 2}" cy="${ls / 2}" r="${ls / 2}" />`
      : `<rect width="${ls}" height="${ls}" rx="8" ry="8" />`;
    const mask = Buffer.from(`<svg width="${ls}" height="${ls}"><defs><clipPath id="c">${clipPath}</clipPath></defs><rect width="${ls}" height="${ls}" fill="white" clip-path="url(#c)" /></svg>`);
    const logoResized = await sharp(input.logoBuffer).resize(ls, ls, { fit: "cover" }).toBuffer();
    const clippedLogo = await sharp(logoResized)
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();
    composed = composed.composite([{ input: clippedLogo, left: lx, top: ly }]);
  }

  return composed.png().toBuffer();
}
