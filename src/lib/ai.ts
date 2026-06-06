// Provider-agnostic AI layer. Switch providers with one env var:
//   AI_PROVIDER=gemini   (free tier — default)
//   AI_PROVIDER=anthropic
// summarize() and rewrite() build the prompts + enforce the safety rules;
// the provider functions just turn (system, user) into text.
import type { Channel } from "./types";

type LLM = (system: string, user: string, maxTokens: number) => Promise<string>;

/** Google Gemini via REST (no SDK dep). Forces JSON output. */
async function callGemini(system: string, user: string, maxTokens: number): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens, responseMimeType: "application/json" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Gemini error: " + JSON.stringify(data).slice(0, 400));
  return (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
}

/** Anthropic via SDK (lazy-imported so it's only loaded when used). */
async function callAnthropic(system: string, user: string, maxTokens: number): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
}

function llm(): LLM {
  return (process.env.AI_PROVIDER || "gemini") === "anthropic" ? callAnthropic : callGemini;
}

function firstJson<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON found in model output");
  return JSON.parse(m[0]) as T;
}

export interface SummaryResult {
  summary: string;
  keyFacts: string[];
  riskFlags: string[];
  aggressiveRewriteWarning: boolean;
}

export async function summarize(input: {
  title: string; excerpt: string; source: string; url: string; body?: string;
}): Promise<SummaryResult> {
  const sourceText = input.body && input.body.length > 200 ? input.body : input.excerpt;
  const sys =
    "You summarise Vietnamese showbiz/music news for an internal editorial tool. " +
    "Rules: base everything ONLY on the provided article text. Do NOT invent, speculate, " +
    "or expand gossip beyond what the text says. Keep the source attributable. Detect " +
    "sensitive topics and flag them. Write in Vietnamese. Output ONLY JSON.";
  const user =
    `Title: ${input.title}\nSource: ${input.source}\nURL: ${input.url}\n\nArticle text:\n${sourceText}\n\n` +
    `Return JSON: {"summary": string (a faithful Vietnamese summary of 200-500 words in 2-4 ` +
    `paragraphs, covering the who/what/when/why and relevant context FROM THE TEXT ONLY — ` +
    `do not pad or invent; if the text is short, summarise what exists rather than fabricating), ` +
    `"keyFacts": string[] (Vietnamese, 3-6 bullet facts), ` +
    `"riskFlags": string[] (subset of ["rumor","unverified","scandal","death","legal","health","relationship"] or empty), ` +
    `"aggressiveRewriteWarning": boolean }`;
  return firstJson<SummaryResult>(await llm()(sys, user, 1600));
}

export interface RewriteResult { caption: string; titles: string[] }

export async function rewrite(input: {
  channel: Channel; summary: string; keyFacts: string[]; source: string; artistHint?: string;
}): Promise<RewriteResult> {
  const c = input.channel;
  const sys =
    "You rewrite an approved factual summary into a social caption for ONE channel. " +
    "Hard rules: keep facts accurate; invent nothing; no defamatory wording; no clickbait " +
    "that changes meaning; do not copy the source phrasing verbatim; mention the source. " +
    "Write in Vietnamese. Adapt tone to the channel. Output ONLY JSON.";
  const user =
    `Channel: ${c.name} (${c.platform})\nVoice/tone: ${c.tone}\nAudience age: ${c.age}\n` +
    `Approved summary: ${input.summary}\nKey facts: ${input.keyFacts.join("; ")}\n` +
    `Source: ${input.source}\nArtist (if any): ${input.artistHint || "n/a"}\n\n` +
    `Return JSON: {"caption": string (1-2 short Vietnamese paragraphs, <=200 words, ` +
    `ends with "Nguồn: ${input.source}"), "titles": string[] (exactly 3 short Vietnamese ` +
    `titles that mention the artist where relevant, no generic filler)}`;
  return firstJson<RewriteResult>(await llm()(sys, user, 900));
}
