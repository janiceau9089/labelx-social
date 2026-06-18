// News collection: RSS-first (scraping is a per-source add-on, see README).
// Only metadata + a short excerpt are stored — never the full article (copyright).
import Parser from "rss-parser";
import type { ArticleCandidate, NewsSource } from "./types";

const parser = new Parser({ timeout: 15000 });

// Decode HTML entities that some RSS feeds use for Vietnamese (e.g. T&uacute; → Tú).
const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»",
  aacute: "á", agrave: "à", acirc: "â", atilde: "ã", auml: "ä", aring: "å",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë",
  iacute: "í", igrave: "ì", icirc: "î", iuml: "ï",
  oacute: "ó", ograve: "ò", ocirc: "ô", otilde: "õ", ouml: "ö",
  uacute: "ú", ugrave: "ù", ucirc: "û", uuml: "ü",
  yacute: "ý", ntilde: "ñ", ccedil: "ç",
  Aacute: "Á", Agrave: "À", Acirc: "Â", Eacute: "É", Egrave: "È", Ecirc: "Ê",
  Iacute: "Í", Oacute: "Ó", Ocirc: "Ô", Uacute: "Ú", Yacute: "Ý",
};
export function decodeEntities(s: string): string {
  return (s || "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : m));
}

// Light keyword sets for category + risk tagging.
const CAT_RULES: [string, RegExp][] = [
  ["concert", /liveshow|concert|đêm nhạc|tour|sân khấu/i],
  ["mv", /\bMV\b|music video|ra mắt mv/i],
  ["album", /album|EP|tracklist/i],
  ["chart", /bảng xếp hạng|BXH|chart|top trending|lượt xem|view/i],
  ["intl", /Kpop|US-UK|quốc tế|BLACKPINK|BTS|Taylor Swift/i],
  ["event", /lễ trao giải|đề cử|sự kiện|liên hoan/i],
];
const RISK_RULES: [string, RegExp][] = [
  ["rumor", /tin đồn|nghi vấn|rộ tin/i],
  ["unverified", /chưa xác nhận|chưa kiểm chứng/i],
  ["scandal", /bê bối|scandal|phốt/i],
  ["death", /qua đời|đột ngột|tang lễ/i],
  ["legal", /kiện|toà án|pháp lý|vi phạm/i],
  ["health", /nhập viện|sức khỏe|bệnh/i],
  ["relationship", /chia tay|hẹn hò|ly hôn|tình cảm/i],
];

// Topics that are clearly NOT showbiz/entertainment, even if they slip through
// a mixed-category RSS feed (e.g. a general news outlet or a broad fanpage).
const OFFTOPIC_BLACKLIST: RegExp =
  /bóng đá|world cup|premier league|v-league|hlv trưởng|đội tuyển|huấn luyện viên|chứng khoán|vn-?index|lãi suất|ngân hàng nhà nước|giá xăng|giá vàng|quốc hội|chính phủ|bầu cử|thủ tướng|chủ tịch nước|tai nạn giao thông|động đất|bão số|thiên tai|covid|dịch bệnh|tòa án nhân dân(?!.*(ca sĩ|diễn viên|nghệ sĩ))/i;

// Showbiz/entertainment signal words — presence of any of these is a strong
// positive signal the article belongs in this tool's feed.
const SHOWBIZ_WHITELIST: RegExp =
  /ca sĩ|diễn viên|nghệ sĩ|người mẫu|hoa hậu|MV|album|liveshow|concert|sân khấu|showbiz|giải trí|nhạc sĩ|đạo diễn|biên kịch|phim ảnh|truyền hình|gameshow|reality show|idol|fan|fandom|Vpop|Kpop|BXH|bảng xếp hạng|lễ trao giải|đề cử|scandal|bê bối|chia tay|hẹn hò|tình cảm/i;

/** True when the text looks like it does NOT belong in a showbiz feed. */
function isOffTopic(text: string): boolean {
  if (SHOWBIZ_WHITELIST.test(text)) return false; // strong showbiz signal — always keep
  if (OFFTOPIC_BLACKLIST.test(text)) return true; // clearly non-showbiz topic — flag it
  return false; // ambiguous (e.g. short excerpt) — don't flag, let admin judge from category/score
}

function categorize(text: string): string {
  for (const [cat, rx] of CAT_RULES) if (rx.test(text)) return cat;
  return "domestic";
}
function riskFlags(text: string): string[] {
  return RISK_RULES.filter(([, rx]) => rx.test(text)).map(([k]) => k);
}

/** Simple, admin-tunable ranking. */
function score(a: { publishedAt: number; credibility: number; category: string; mentions: number; offTopic?: boolean }): number {
  const ageHrs = (Date.now() - a.publishedAt) / 3.6e6;
  const recency = Math.max(0, 24 - ageHrs) / 24;          // 0..1
  const musicRelevant = ["mv", "album", "chart", "concert"].includes(a.category) ? 1 : 0.6;
  const raw = 100 * (0.35 * recency + 0.2 * (a.credibility / 10) + 0.15 * musicRelevant + 0.3 * Math.min(1, a.mentions / 3));
  return Math.round(a.offTopic ? raw * 0.4 : raw); // off-topic items rank much lower but stay visible
}

/**
 * Best-effort fetch of an article's readable text, used ONLY at summarise time
 * so the model can write a faithful 200-500 word summary. Not stored anywhere.
 */
export async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LabelXBot/1.0)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return "";
    let html = await res.text();
    html = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
    const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
    let text = paras.join("\n").length > 300 ? paras.join("\n") : html;
    text = decodeEntities(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    return text.slice(0, 6000);
  } catch {
    return "";
  }
}

/** Extract candidate image URLs from an article page (og:image + <img>). */
export async function fetchArticleImages(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LabelXBot/1.0)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const base = new URL(url);
    const found = new Set<string>();
    for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) found.add(m[1]);
    for (const m of html.matchAll(/<img[^>]+(?:data-src|data-original|src)=["']([^"']+)["']/gi)) found.add(m[1]);
    const abs = [...found]
      .map((u) => { try { return new URL(u, base).href; } catch { return ""; } })
      .filter((u) => /^https?:\/\//.test(u) && /\.(jpe?g|png|webp)(\?|$)/i.test(u))
      .filter((u) => !/sprite|logo|icon|avatar|1x1|pixel|placeholder|blank/i.test(u));
    return [...new Set(abs)].slice(0, 12);
  } catch {
    return [];
  }
}

/** Fetch the last 24h from RSS sources, dedupe, score. */
export async function collectFromSources(sources: NewsSource[]): Promise<ArticleCandidate[]> {
  const since = Date.now() - 24 * 3.6e6;
  const raw: Array<{ source: string; credibility: number; title: string; url: string; publishedAt: number; excerpt: string }> = [];

  for (const s of sources) {
    if (!s.active || !s.rssUrl) continue;
    try {
      const feed = await parser.parseURL(s.rssUrl);
      for (const item of feed.items) {
        const ts = item.isoDate ? Date.parse(item.isoDate) : Date.now();
        if (ts < since) continue;
        raw.push({
          source: s.name,
          credibility: s.credibility,
          title: decodeEntities((item.title || "").trim()),
          url: item.link || "",
          publishedAt: ts,
          excerpt: decodeEntities((item.contentSnippet || item.content || "").slice(0, 280)), // short snippet only
        });
      }
    } catch (e) {
      console.error(`RSS failed for ${s.name}:`, (e as Error).message);
    }
  }

  // Dedupe by URL, count cross-source title mentions (loose).
  const byUrl = new Map<string, (typeof raw)[number]>();
  for (const r of raw) if (r.url && !byUrl.has(r.url)) byUrl.set(r.url, r);
  const items = [...byUrl.values()];
  const mentionOf = (title: string) =>
    items.filter((x) => {
      const a = new Set(title.toLowerCase().split(/\s+/));
      const b = x.title.toLowerCase().split(/\s+/);
      const overlap = b.filter((w) => a.has(w)).length;
      return overlap >= 3;
    }).length;

  const now = Date.now();
  return items.map((r) => {
    const blob = `${r.title} ${r.excerpt}`;
    const category = categorize(blob);
    const offTopic = isOffTopic(blob);
    const flags = riskFlags(blob);
    if (offTopic) flags.push("off-topic");
    return {
      id: Buffer.from(r.url).toString("base64url").slice(0, 40),
      source: r.source,
      title: r.title,
      url: r.url,
      publishedAt: r.publishedAt,
      category,
      excerpt: r.excerpt,
      flags,
      score: score({ publishedAt: r.publishedAt, credibility: r.credibility, category, mentions: mentionOf(r.title), offTopic }),
      fetchedAt: now,
      expiresAt: now + 48 * 3.6e6,
    } as ArticleCandidate;
  });
}
