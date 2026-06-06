# LabelX — Media Asset Automation Tool

Internal tool: collects Vietnamese showbiz/music news, summarises it safely with
Claude, rewrites it per Facebook Page / Instagram account, and composes
title-on-image assets for **export** (download / copy). Direct publishing to
Meta is intentionally left for Phase 2.

Stack: **Next.js (App Router) + Firebase (Firestore / Auth / Storage) + Claude**,
deployed on **Vercel**. News is pulled hourly by a Vercel Cron job.

> This is a working starter, not a finished product. The full pipeline runs
> (sign in → news → summary → rewrite → compose → export). Admin CRUD, scraping
> for sources without RSS, real photo compositing, and Meta publishing are the
> build-out areas — each is flagged in code with a comment.

---

## What you do vs. what's already done

**Already built (no code from you):** the app, auth + allow-list, Firestore
schema, the Claude summarise/rewrite calls with safety guardrails, the news
collector, the canvas image compositor, and the export flow.

**You configure:** create the accounts below, paste keys into env vars, push to
GitHub, connect Vercel, point your domain.

**You'll eventually touch code for:** admin edit forms, per-source scrape
selectors, and (Phase 2) Meta publishing. Each is marked with a `// TODO`/comment.

---

## 1. Accounts & keys to create

| Service | What you get | Where |
|---|---|---|
| **Firebase** | Firestore, Auth (Google), Storage | console.firebase.google.com → create project |
| **AI model** | Summaries + rewrites. Default **Google Gemini (free tier)** — `GEMINI_API_KEY` from aistudio.google.com. Switch to Claude anytime with `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`. | aistudio.google.com/app/apikey |
| **Google Programmable Search** | `GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX` (image "Web" tab) | programmablesearchengine.google.com + Google Cloud API key |
| **Vercel** | hosting + cron | vercel.com (connect your GitHub repo) |
| **GitHub** | the repo | push this folder |
| **Your domain** | custom URL + privacy page | add in Vercel → Domains |

Anthropic and Google Search are pay-as-you-go; Firebase and Vercel have free
tiers that comfortably cover a 2–3 person internal tool.

## 2. Firebase setup

1. Create a Firebase project. In **Build → Authentication**, enable **Google**
   sign-in.
2. In **Build → Firestore Database**, create a database (production mode). Paste
   the contents of `firestore.rules` into **Rules** and publish.
3. **Project settings → General → Your apps → Web app**: copy the config values
   into the `NEXT_PUBLIC_FIREBASE_*` vars.
4. **Project settings → Service accounts → Generate new private key**: download
   the JSON, and copy `project_id`, `client_email`, `private_key` into the
   `FIREBASE_*` vars. Keep the `private_key` on one line with literal `\n`.

## 3. Local run

```bash
npm install
cp .env.example .env.local      # fill in every value
npm run seed                    # writes starter channels + sources to Firestore
npm run dev                     # http://localhost:3000
```

Sign in with a Google account whose email is in `ALLOWED_EMAILS`.

To load news locally, hit the collector once (it's normally on a schedule):

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/collect-news
```

## 4. Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel, **Import** the repo (framework auto-detected as Next.js).
3. Add **all** the env vars from `.env.example` under
   **Settings → Environment Variables** (Production + Preview).
4. Deploy. `vercel.json` registers the hourly cron at `/api/cron/collect-news`
   automatically — Vercel sends the `CRON_SECRET` as the Authorization bearer.
5. **Domains → Add** your domain.
6. Back in Firebase Auth → **Settings → Authorized domains**, add your Vercel
   domain and your custom domain so Google sign-in works.

That's your live, export-first launch. 🎉

## 5. How it works

- **News** — `vercel.json` cron → `/api/cron/collect-news` → `lib/news.ts`
  reads RSS sources from Firestore, keeps only the last 24h, stores **metadata +
  a short excerpt** (never full text), scores and caches them in
  `articleCandidates`.
- **Summary** — clicking an article calls `/api/ai/summarize` → Claude returns
  facts-only summary + risk flags (rumor/unverified/health/…); the prompt
  forbids inventing or expanding gossip.
- **Rewrite** — pick channels → `/api/ai/rewrite` adapts the summary to each
  channel's voice, returns caption + 3 artist-relevant titles, and attaches the
  channel's locked hashtags + CTA.
- **Compose & export** — a canvas renders the title onto the image; download the
  PNG and copy the caption. No data is persisted after the session.

## 6. Build-out checklist (in priority order)

1. **Admin CRUD** — forms in `src/app/admin` + `/api/admin/*` routes (Admin-SDK
   writes guarded by `isAdmin()`), so non-developers can manage channels,
   styles, frames, logos, sources, and safety rules.
2. **Polished UI** — `public/prototype.html` is the full clickable design
   (carousel, realistic FB/IG preview, frames/logos). Port its styling into
   `src/app/workflow/page.tsx`.
3. **Sources without RSS** — add `scrapeUrl` + CSS selectors and a scrape path in
   `lib/news.ts` (respect robots.txt; rate-limit).
4. **Real photo compositing** — use CORS-enabled images or composite server-side
   with `sharp` so the exported PNG includes the chosen photo (browser canvas
   taints on cross-origin images).
5. **Frames / logos / fonts on the image** — load from Firebase Storage per
   channel rules.

## 7. Phase 2 — Meta publishing (start early)

Direct posting to Facebook/Instagram needs a **Meta Developer app** and **App
Review** (~2–4 weeks). Do this in parallel:

1. developers.facebook.com → create an app; add your Pages and link each IG
   account (must be Business/Creator linked to a Page).
2. Request permissions `instagram_basic` + `instagram_content_publish` (+ Pages
   publishing).
3. Provide a **privacy policy URL** (host one on your domain) and a screen
   recording of the flow for review.
4. After approval, store long-lived Page/IG tokens (encrypted) and add a
   `/api/publish` route: IG is two-step — `POST /{ig-user-id}/media` then
   `/{ig-user-id}/media_publish`; mind the ~100 posts/24h and hourly call limits
   (`GET /{ig-user-id}/content_publishing_limit`). Gate every publish behind an
   explicit confirm.

## 8. Safety & compliance (already wired, keep it)

Facts-only prompts, risk flags, source citation, "reference only" image labels,
no permanent storage of generated content, email allow-list, server-side keys.
Don't loosen these — they're what keep the tool out of copyright/misinfo trouble.

---

**AI provider:** `AI_PROVIDER` chooses the model backend. Default `gemini`
(free tier — set `GEMINI_API_KEY`, `GEMINI_MODEL` e.g. `gemini-2.0-flash`).
Set `AI_PROVIDER=anthropic` to use Claude instead (`ANTHROPIC_API_KEY`,
`ANTHROPIC_MODEL`). The code is identical for both; it's a one-line env change.
Note: Gemini's free tier may use prompts to improve their models — fine for
testing, but review Google's terms before sending sensitive company content in
production (Claude's API does not train on your data).
