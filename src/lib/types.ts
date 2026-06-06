// Shared data models. These mirror the development brief's schema.

export type Platform = "FB" | "IG";

export interface Channel {
  id: string;
  name: string;
  platform: Platform;
  tone: string;            // e.g. "Premium editorial", "Gen Z casual"
  age: string;             // audience age range, e.g. "16-24"
  color: string;           // brand color (hex) for frame/preview
  allowColor: boolean;     // may the user change the frame color?
  tags: string[];          // 3 pre-ruled brand hashtags
  cta: string;             // default call-to-action text
}

export interface StyleProfile {
  id: string;
  name: string;
  tone: string;
  doRules: string[];
  dontRules: string[];
}

export interface NewsSource {
  id: string;
  name: string;
  rssUrl?: string;         // preferred
  scrapeUrl?: string;      // fallback (selectors handled in news lib)
  credibility: number;     // 1-10
  active: boolean;
}

export interface ArticleCandidate {
  id: string;
  source: string;
  title: string;
  url: string;
  publishedAt: number;     // epoch ms
  category: string;
  excerpt: string;         // short snippet only — never the full article
  score: number;
  flags: string[];         // e.g. ["rumor","unverified"]
  fetchedAt: number;
  expiresAt: number;
}

export interface GeneratedPost {
  channelId: string;
  title: string;
  caption: string;
  hashtagsLocked: string[];
  hashtagsAuto: string[];
  includeCTA: boolean;
  cta: string;
}
