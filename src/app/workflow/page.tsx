"use client";
/**
 * LabelX workflow — full 5-step UI wired to the real backend.
 * Step 4 supports up to 10 images per post (carousel): the COVER (image 1) gets
 * the frame + title; images 2-10 are plain. Web/Article photos are loaded via a
 * server proxy so the canvas stays exportable. Publishing to Meta is omitted.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, authFetch } from "@/lib/useAuth";
import { AUTH_DISABLED } from "@/lib/config";
import type { User } from "firebase/auth";

/* ---------- types ---------- */
type Channel = {
  id: string; name: string; platform: "FB" | "IG"; tone: string; age: string;
  color: string; allowColor: boolean; tags: string[]; cta: string;
};
type Article = {
  id: string; source: string; title: string; url: string;
  category: string; excerpt: string; score: number; flags: string[];
};
type Summary = { summary: string; keyFacts: string[]; riskFlags: string[]; aggressiveRewriteWarning: boolean };
type Photo = { img: HTMLImageElement; kind: "web" | "article" | "upload" };
type Post = {
  ch: Channel;
  titles: string[]; titleIdx: number; title: string;
  caption: string; lockedTags: string[]; autoTags: string[];
  includeCTA: boolean; cta: string; locked: boolean;
  // step 4
  photos: Photo[]; // [0] = cover (gets frame+title); rest are plain
  srcMode: "none" | "web" | "article"; query: string;
  webResults: { thumb?: string; url: string }[]; articleImages: string[]; picking: boolean;
  frame: "premade" | "black" | "custom"; frameColor: string; logo: boolean;
  imgTitle: string; titleSize: "s" | "m" | "l"; titleColor: string; imgLocked: boolean;
  // step 5
  capOpen: boolean;
};
const MAX_PHOTOS = 10;

/* ---------- constants ---------- */
const CATS = [
  { key: "all", name: "All" }, { key: "domestic", name: "Domestic" }, { key: "intl", name: "International" },
  { key: "concert", name: "Concert" }, { key: "mv", name: "MV" }, { key: "album", name: "Album" },
  { key: "chart", name: "Charts" }, { key: "event", name: "Events" },
];
const CATNAME: Record<string, string> = { domestic: "Domestic", intl: "Intl", concert: "Concert", mv: "MV", album: "Album", chart: "Charts", event: "Event" };
const STEPS = ["News", "Summary", "Rewrite", "Image", "Publish"];
const IMG_COLORS = ["#3b4252", "#4a4458", "#2b2b2e", "#264653"];
const FLAG_LABEL: Record<string, [string, string]> = {
  rumor: ["Rumor", "f-danger"], unverified: ["Unverified", "f-danger"], scandal: ["Scandal", "f-danger"],
  death: ["Death", "f-danger"], legal: ["Legal", "f-warn"], health: ["Health", "f-warn"], relationship: ["Relationship", "f-warn"],
};

function autoTagsFor(a: Article, variant = 0): string[] {
  const cat: Record<string, string> = { domestic: "#Vpop", intl: "#Kpop", concert: "#Liveshow", mv: "#MVmoi", album: "#Album", chart: "#BXH", event: "#SuKienAmNhac" };
  const sets = [[cat[a.category] || "#Music", "#trending"], [cat[a.category] || "#Music", "#showbiz"], [cat[a.category] || "#Music", "#viral"]];
  return sets[variant % sets.length];
}
function fullText(p: Post): string {
  let s = p.caption + "\n\n" + [...p.lockedTags, ...p.autoTags].join(" ");
  if (p.includeCTA && p.cta) s += "\n\n" + p.cta;
  return s;
}

/* Load an external image through our proxy → same-origin blob so the canvas
   stays exportable. Returns a loaded <img>. */
async function loadProxyImg(user: User, rawUrl: string): Promise<HTMLImageElement> {
  const r = await authFetch(user, "/api/images/proxy?url=" + encodeURIComponent(rawUrl));
  if (!r.ok) throw new Error((await r.text()) || ("proxy " + r.status));
  const blob = await r.blob();
  const obj = URL.createObjectURL(blob);
  return await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = obj; });
}
function fileToImg(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = (e) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = e.target!.result as string; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}

/* ---------- canvas ---------- */
function drawCover(cv: HTMLCanvasElement | null, p: Post, source: string) {
  if (!cv) return;
  const x = cv.getContext("2d"); if (!x) return;
  const W = 540, H = 540, cover = p.photos[0];
  if (cover?.img) { const iw = cover.img.width, ih = cover.img.height, s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s; x.drawImage(cover.img, (W - dw) / 2, (H - dh) / 2, dw, dh); }
  else { const c = IMG_COLORS[2]; const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, c); g.addColorStop(1, "#08080a"); x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = "rgba(255,255,255,.05)"; x.font = "12px Inter,sans-serif"; x.textAlign = "left"; x.fillText("[ pick a cover image ]", W / 2 - 60, H / 2); }
  const fc = p.frame === "black" ? "#000" : p.frame === "premade" ? p.ch.color : p.frameColor;
  const b = 20; x.fillStyle = fc; x.fillRect(0, 0, W, b); x.fillRect(0, H - b * 3, W, b * 3); x.fillRect(0, 0, b, H); x.fillRect(W - b, 0, b, H);
  const gg = x.createLinearGradient(0, H - 180, 0, H); gg.addColorStop(0, "rgba(0,0,0,0)"); gg.addColorStop(1, "rgba(0,0,0,.62)"); x.fillStyle = gg; x.fillRect(0, H - 180, W, 180);
  const title = (p.imgTitle && p.imgTitle.trim()) ? p.imgTitle : (p.title || "Title");
  const size = { s: 21, m: 27, l: 33 }[p.titleSize]; const cpl = size <= 21 ? 27 : size >= 33 ? 18 : 22;
  x.font = "700 " + size + 'px "Wix Madefor Display",Inter,sans-serif'; x.textAlign = "center";
  const words = title.split(" "); let lines: string[] = [], cur = "";
  words.forEach((w) => { if ((cur + " " + w).length > cpl) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; });
  if (cur) lines.push(cur); lines = lines.slice(0, 3);
  const lh = size + 7, tc = p.titleColor, sc = tc === "#000000" ? "rgba(255,255,255,.85)" : "rgba(0,0,0,.8)";
  let yy = H - b * 3 - (lines.length - 1) * lh - 16;
  lines.forEach((ln) => { x.lineWidth = 5; x.strokeStyle = sc; x.strokeText(ln, W / 2, yy); x.fillStyle = tc; x.fillText(ln, W / 2, yy); yy += lh; });
  x.textAlign = "left";
  if (p.logo) { x.fillStyle = "rgba(255,255,255,.95)"; x.fillRect(W - b - 90, b + 12, 78, 24); x.fillStyle = "#000"; x.font = '800 12px "Wix Madefor Display",sans-serif'; x.fillText("✕LABELX", W - b - 84, b + 29); }
  x.fillStyle = "rgba(255,255,255,.65)"; x.font = "10px Inter,sans-serif"; x.fillText("Nguồn: " + source, b + 6, H - b - 6);
}
function drawPlain(cv: HTMLCanvasElement, ph: Photo) {
  const x = cv.getContext("2d"); if (!x) return; const W = 540, H = 540;
  x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
  if (ph.img) { const iw = ph.img.width, ih = ph.img.height, s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s; x.drawImage(ph.img, (W - dw) / 2, (H - dh) / 2, dw, dh); }
}
function CoverCanvas({ id, post, source }: { id: string; post: Post; source: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { drawCover(ref.current, post, source); });
  return <canvas id={id} ref={ref} width={540} height={540} style={{ width: "100%" }} />;
}

/* ---------- FB/IG preview ---------- */
function captionParts(p: Post, limit: number): { text: string; toggle: boolean; less: boolean } {
  const raw = fullText(p);
  if (p.capOpen || raw.length <= limit) return { text: raw, toggle: p.capOpen && raw.length > limit, less: true };
  return { text: raw.slice(0, limit).replace(/\s+\S*$/, "") + "… ", toggle: true, less: false };
}
function PostPreview({ id, post, source, onToggleCap }: { id: string; post: Post; source: string; onToggleCap: () => void }) {
  const ch = post.ch, n = post.photos.length;
  const avbg = ch.color === "#ffffff" ? "#111" : ch.color;
  const av = <div className="avatar" style={{ background: avbg }}>{(ch.name.replace("@", "")[0] || "L").toUpperCase()}</div>;
  const badge = n > 1 ? <div style={{ position: "absolute", top: 8, right: 10, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 12 }}>1/{n} ▦</div> : null;
  const canvas = <div className="post-img" style={{ position: "relative" }}>{badge}<CoverCanvas id={id} post={post} source={source} /></div>;
  if (ch.platform === "IG") {
    const c = captionParts(post, 110);
    return (
      <div className="post">
        <div className="post-h">{av}<div><div className="nm">{ch.name.replace("@", "")}</div></div><div className="more">⋯</div></div>
        {canvas}
        <div className="ig-actions"><span>♡</span><span>💬</span><span>➤</span><span className="right">🔖</span></div>
        <div className="ig-likes">1,248 likes</div>
        <div className="ig-cap"><b>{ch.name.replace("@", "")}</b> {c.text}{c.toggle && <span className="seemore" onClick={onToggleCap}>{c.less ? "See less" : "… more"}</span>}</div>
        <div className="ig-cmt">View all 42 comments</div>
      </div>
    );
  }
  const c = captionParts(post, 200);
  return (
    <div className="post">
      <div className="post-h">{av}<div><div className="nm">{ch.name}</div><div className="tm">2h · 🌐</div></div><div className="more">⋯</div></div>
      <div className="post-cap">{c.text}{c.toggle && <span className="seemore" onClick={onToggleCap}>{c.less ? "See less" : "See more"}</span>}</div>
      {canvas}
      <div className="fb-counts"><span>👍❤️ 1.2K</span><span>84 comments · 23 shares</span></div>
      <div className="fb-actions"><div>👍 Like</div><div>💬 Comment</div><div>↪ Share</div></div>
    </div>
  );
}

/* ============================ MAIN ============================ */
export default function Workflow() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [news, setNews] = useState<Article[]>([]);
  const [cat, setCat] = useState("all");
  const [step, setStep] = useState(1);
  const [article, setArticle] = useState<Article | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [posts, setPosts] = useState<Record<string, Post>>({});
  const [carIdx, setCarIdx] = useState(0);
  const [busy, setBusy] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualMode, setManualMode] = useState<"link" | "text">("link");
  const [manualErr, setManualErr] = useState("");

  useEffect(() => { if (!AUTH_DISABLED && !loading && !user) router.replace("/"); }, [loading, user, router]);
  useEffect(() => {
    if (!user && !AUTH_DISABLED) return;
    authFetch(user, "/api/news").then(async (r) => { if (r.ok) { const d = await r.json(); setChannels(d.channels || []); setNews(d.news || []); } });
  }, [user]);

  const setPost = useCallback((id: string, patch: Partial<Post>) => setPosts((all) => ({ ...all, [id]: { ...all[id], ...patch } })), []);
  const ordered = () => channels.filter((c) => selected.includes(c.id) && posts[c.id]);

  if (!user && !AUTH_DISABLED) return <div className="wrap">Loading…</div>;

  async function openArticle(a: Article) {
    setArticle(a); setSummary(null); setSelected([]); setPosts({}); setStep(2); setBusy("summary");
    const r = await authFetch(user!, "/api/ai/summarize", { method: "POST", body: JSON.stringify({ title: a.title, excerpt: a.excerpt, source: a.source, url: a.url }) });
    setBusy("");
    if (r.ok) setSummary(await r.json()); else alert("Summarize failed: " + (await r.text()));
  }
  async function openManualUrl() {
    setManualErr("");
    let url = manualUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    let host = "";
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { setManualErr("Link không hợp lệ"); return; }
    const a: Article = { id: "manual-" + Date.now(), source: host, title: "", url, category: "domestic", excerpt: "", score: 0, flags: [] };
    setManualUrl("");
    await openArticle(a);
  }
  async function openManualText() {
    setManualErr("");
    const text = manualText.trim();
    if (!text) return;
    if (text.length < 30) { setManualErr("Đoạn văn quá ngắn, vui lòng nhập thêm nội dung"); return; }
    const a: Article = { id: "manual-" + Date.now(), source: "Nhập tay", title: "", url: "", category: "domestic", excerpt: text, score: 0, flags: [] };
    setManualText("");
    await openArticle(a);
  }
  function toggleChannel(id: string) { setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]); }
  function toggleAll() { setSelected((s) => s.length === channels.length ? [] : channels.map((c) => c.id)); }

  async function rewriteOne(ch: Channel): Promise<Post | null> {
    const r = await authFetch(user!, "/api/ai/rewrite", { method: "POST", body: JSON.stringify({ channelId: ch.id, summary: summary!.summary, keyFacts: summary!.keyFacts, source: article!.source }) });
    if (!r.ok) return null;
    const d = await r.json();
    const titles: string[] = d.titles?.length ? d.titles : [article!.title];
    return {
      ch, titles, titleIdx: 0, title: titles[0], caption: d.caption || "",
      lockedTags: d.hashtagsLocked || ch.tags || [], autoTags: autoTagsFor(article!), includeCTA: true, cta: d.cta || ch.cta || "",
      locked: false, photos: [], srcMode: "none", query: "", webResults: [], articleImages: [], picking: false,
      frame: "premade", frameColor: "#000000", logo: true, imgTitle: "", titleSize: "m", titleColor: "#ffffff", imgLocked: false, capOpen: false,
    };
  }
  async function generate() {
    if (!summary || !article) return;
    setBusy("generate");
    const next: Record<string, Post> = { ...posts };
    for (const id of selected) { if (next[id]) continue; const ch = channels.find((c) => c.id === id)!; const p = await rewriteOne(ch); if (p) next[id] = p; }
    Object.keys(next).forEach((id) => { if (!selected.includes(id)) delete next[id]; });
    setBusy(""); setPosts(next); setCarIdx(0); setStep(3);
  }
  async function regenCaption(id: string) {
    const ch = posts[id].ch; setBusy("re" + id);
    const p = await rewriteOne(ch); setBusy("");
    if (p) setPost(id, { caption: p.caption, titles: p.titles, titleIdx: 0, title: p.titles[0] });
  }

  const ord = ordered();
  const clampCar = Math.max(0, Math.min(carIdx, ord.length - 1));
  const nextUnlocked = (key: "locked" | "imgLocked") => {
    for (let k = clampCar + 1; k < ord.length; k++) if (!posts[ord[k].id][key]) return k;
    for (let k = 0; k < ord.length; k++) if (!posts[ord[k].id][key]) return k;
    return clampCar;
  };

  /* ----- image handling ----- */
  function addPhoto(id: string, ph: Photo) {
    setPosts((all) => { const p = all[id]; if (p.photos.length >= MAX_PHOTOS) return all; return { ...all, [id]: { ...p, photos: [...p.photos, ph] } }; });
  }
  function removePhoto(id: string, idx: number) { setPosts((all) => { const p = all[id]; return { ...all, [id]: { ...p, photos: p.photos.filter((_, i) => i !== idx) } }; }); }
  function makeCover(id: string, idx: number) { setPosts((all) => { const p = all[id]; const ph = p.photos[idx]; const rest = p.photos.filter((_, i) => i !== idx); return { ...all, [id]: { ...p, photos: [ph, ...rest] } }; }); }

  async function onUploadFile(id: string, file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image too large — max 5 MB"); return; }
    try { addPhoto(id, { img: await fileToImg(file), kind: "upload" }); } catch { alert("Couldn't read image"); }
  }
  async function searchWeb(id: string) {
    const q = posts[id].query;
    const r = await authFetch(user!, "/api/images/search?q=" + encodeURIComponent(q));
    if (r.ok) { const d = await r.json(); setPost(id, { webResults: (d.results || []).slice(0, 16) }); }
    else setPost(id, { webResults: [] });
  }
  async function loadArticleImgs(id: string) {
    setPost(id, { srcMode: "article" });
    if (posts[id].articleImages.length) return;
    const r = await authFetch(user!, "/api/images/article?url=" + encodeURIComponent(article?.url || ""));
    if (r.ok) setPost(id, { articleImages: (await r.json()).images || [] });
  }
  async function pickExternal(id: string, rawUrl: string, kind: "web" | "article") {
    setPost(id, { picking: true });
    try { const img = await loadProxyImg(user!, rawUrl); addPhoto(id, { img, kind }); }
    catch (e) { alert("Không tải được ảnh này (" + ((e as Error).message || "?") + "). Thử ảnh khác hoặc Upload."); }
    setPost(id, { picking: false });
  }

  function downloadOne(canvasId: string, name: string) {
    const cv = document.getElementById(canvasId) as HTMLCanvasElement | null; if (!cv) return;
    const a = document.createElement("a"); a.download = name; a.href = cv.toDataURL(); a.click();
  }
  function downloadAll(id: string) {
    const p = posts[id];
    if (p.photos.length <= 1) { downloadOne("cv5_" + id, "labelx_" + id + ".png"); return; }
    p.photos.forEach((ph, i) => {
      let dataUrl: string;
      if (i === 0) { const cv = document.getElementById("cv5_" + id) as HTMLCanvasElement; dataUrl = cv.toDataURL(); }
      else { const off = document.createElement("canvas"); off.width = 540; off.height = 540; drawPlain(off, ph); dataUrl = off.toDataURL(); }
      const a = document.createElement("a"); a.download = `labelx_${id}_${i + 1}.png`; a.href = dataUrl; a.click();
    });
  }
  function copy(t: string) { navigator.clipboard?.writeText(t); }

  const list = news.filter((a) => cat === "all" || a.category === cat);

  return (
    <div id="app">
      <header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/labelx.png" alt="LabelX" style={{ height: 26, display: "block" }} />
        <span className="role-tag">{user?.email || "demo"}</span>
        <div className="spacer" />
        <nav><a href="/admin" style={{ color: "var(--mut)", padding: "8px 12px", textDecoration: "none" }}>Admin</a></nav>
        {!AUTH_DISABLED && <button className="btn ghost sm" onClick={() => signOut()}>Sign out</button>}
      </header>

      <div className="wrap">
        <div className="steps">
          {STEPS.map((s, i) => { const n = i + 1; const cls = n === step ? "on" : n < step ? "done" : ""; return <div key={s} className={"step " + cls}><b>STEP {n}</b>{s}</div>; })}
        </div>

        <div className="stepwrap" key={step}>
        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div className="head"><h2>News</h2></div>
            <div className="card" style={{ padding: 12, marginBottom: 12 }}>
              <div className="tabs" style={{ marginBottom: 10 }}>
                <button className={"tab " + (manualMode === "link" ? "on" : "")} onClick={() => { setManualMode("link"); setManualErr(""); }}>Link</button>
                <button className={"tab " + (manualMode === "text" ? "on" : "")} onClick={() => { setManualMode("text"); setManualErr(""); }}>Văn bản</button>
              </div>
              {manualMode === "link" ? (
                <>
                  <div className="fieldlab">Dán link tin tức (báo, fanpage, bài viết bất kỳ)</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="mini"
                      style={{ flex: 1 }}
                      placeholder="https://..."
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") openManualUrl(); }}
                    />
                    <button className="btn sm" disabled={!manualUrl.trim() || busy === "summary"} onClick={openManualUrl}>
                      {busy === "summary" ? "Đang xử lý…" : "Dùng link này →"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="fieldlab">Dán hoặc nhập thẳng nội dung (không cần link)</div>
                  <textarea
                    className="mini autogrow"
                    style={{ width: "100%", minHeight: 90 }}
                    placeholder="Nhập đoạn văn bản tin tức ở đây…"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button className="btn sm" disabled={!manualText.trim() || busy === "summary"} onClick={openManualText}>
                      {busy === "summary" ? "Đang xử lý…" : "Dùng văn bản này →"}
                    </button>
                  </div>
                </>
              )}
              {manualErr && <div className="muted" style={{ color: "var(--danger, #e35)", marginTop: 6, fontSize: 12.5 }}>{manualErr}</div>}
            </div>
            <div className="tabs">{CATS.map((c) => <button key={c.key} className={"tab " + (cat === c.key ? "on" : "")} onClick={() => setCat(c.key)}>{c.name}</button>)}</div>
            <div className="card list">
              {list.length === 0 && <div className="muted" style={{ padding: 12 }}>No news yet. Run the collector or wait for the hourly cron.</div>}
              {list.map((a, i) => (
                <div className="article" key={a.id} onClick={() => openArticle(a)}>
                  <div className="num">{i + 1}</div>
                  <div style={{ flex: 1 }}><div className="atitle">{a.title}</div>
                    <div className="a-meta"><span>{a.source}</span><span className="chip">{CATNAME[a.category] || a.category}</span>{a.flags?.length > 0 && <span className="flag f-warn">Sensitive</span>}</div>
                  </div><div className="arrow">→</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && article && (
          <>
            <div className="head"><h2>Summary</h2></div>
            <div className="card">
              <h2 style={{ fontSize: 18, lineHeight: 1.3 }}>{article.title || article.url || "Văn bản nhập tay"}</h2>
              <div className="a-meta" style={{ margin: "8px 0 14px" }}><span className="chip">{article.source}</span><span className="chip">{CATNAME[article.category] || article.category}</span></div>
              {busy === "summary" ? <p className="muted">Summarising…</p> : summary && (
                <>
                  <p style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{summary.summary}</p>
                  <label>Key facts</label>
                  <ul style={{ margin: "6px 0 12px", paddingLeft: 18, lineHeight: 1.7 }}>{summary.keyFacts.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  {summary.riskFlags.length > 0 && <div><label>Risk flags</label><div>{summary.riskFlags.map((f) => { const m = FLAG_LABEL[f] || [f, "f-warn"]; return <span key={f} className={"flag " + m[1]}>{m[0]}</span>; })}</div></div>}
                  {summary.aggressiveRewriteWarning && <div className="note"><span>⚠️</span><span>Rumor / unverified — keep it neutral and cite the source.</span></div>}
                  <div><label>Source</label><a href={article.url} target="_blank" rel="noreferrer">{article.source} ↗</a></div>
                </>
              )}
            </div>
            <div className="navrow"><button className="btn ghost sm" onClick={() => setStep(1)}>← News</button><button className="btn" disabled={!summary} onClick={() => setStep(3)}>Use this topic →</button></div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <div className="head"><h2>Rewrite per channel</h2></div>
            <div className="card">
              <label style={{ margin: 0 }}>Connected channels</label>
              <div className="chanrow">
                <label className="selall"><input type="checkbox" checked={selected.length === channels.length} onChange={toggleAll} /> All</label>
                <div className="chanscroll">
                  {channels.map((c) => (
                    <span key={c.id} className={"pill " + (selected.includes(c.id) ? "sel" : "")} onClick={() => toggleChannel(c.id)}>
                      <span className="dot" style={{ background: c.color, border: "1px solid #777" }} />{c.name} <span className="muted" style={selected.includes(c.id) ? { color: "#000" } : {}}>{c.platform}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {selected.length === 0 ? (
              <div className="card muted">Select a channel, then Generate.</div>
            ) : (
              <>
                {selected.some((id) => !posts[id]) && (
                  <div className="navrow"><button className="btn" disabled={busy === "generate"} onClick={generate}>{busy === "generate" ? "Generating…" : ord.length ? `Generate ${selected.filter((id) => !posts[id]).length} more` : "Generate"}</button></div>
                )}
                {ord.length > 0 && <>
                <div className="carhead">
                  <div className="carcount">Channel {clampCar + 1}/{ord.length} · {ord[clampCar]?.name}</div>
                  <div className="carnav"><button className="cbtn" disabled={clampCar === 0} onClick={() => setCarIdx(clampCar - 1)}>‹</button><button className="cbtn" disabled={clampCar === ord.length - 1} onClick={() => setCarIdx(clampCar + 1)}>›</button></div>
                </div>
                <div className="carstage">{ord[clampCar] && <Subbox3 post={posts[ord[clampCar].id]} setPost={setPost} onLock={() => { setPost(ord[clampCar].id, { locked: true }); setCarIdx(nextUnlocked("locked")); }} onEdit={() => setPost(ord[clampCar].id, { locked: false })} onRemove={() => setSelected((s) => s.filter((x) => x !== ord[clampCar].id))} onRegen={() => regenCaption(ord[clampCar].id)} busy={busy === "re" + ord[clampCar].id} />}</div>
                <div className="thumbstrip">{ord.map((c, i) => <div key={c.id} className={"cthumb " + (i === clampCar ? "on " : "") + (posts[c.id].locked ? "done" : "")} onClick={() => setCarIdx(i)}><span className="dot" style={{ background: c.color, border: "1px solid #777", display: "inline-block", width: 8, height: 8, borderRadius: "50%" }} />{c.name}<span className="st">{posts[c.id].locked ? "✓" : ""}</span></div>)}</div>
                </>}
              </>
            )}
            <div className="navrow">
              <button className="btn ghost sm" onClick={() => setStep(2)}>← Back</button>
              <button className="btn" disabled={!(selected.length && selected.every((id) => posts[id]?.locked))} onClick={() => { setCarIdx(0); setStep(4); }}>Next: Image →</button>
            </div>
          </>
        )}

        {/* STEP 4 */}
        {step === 4 && ord.length > 0 && (
          <>
            <div className="head"><h2>Image</h2><div className="sub">Up to {MAX_PHOTOS} photos per post · image 1 (cover) gets the frame + title, the rest are plain</div></div>
            <div className="carhead">
              <div className="carcount">Channel {clampCar + 1}/{ord.length} · {ord[clampCar]?.name}</div>
              <div className="carnav"><button className="cbtn" disabled={clampCar === 0} onClick={() => setCarIdx(clampCar - 1)}>‹</button><button className="cbtn" disabled={clampCar === ord.length - 1} onClick={() => setCarIdx(clampCar + 1)}>›</button></div>
            </div>
            {ord[clampCar] && <Card4 post={posts[ord[clampCar].id]} source={article?.source || ""} setPost={setPost}
              onSearch={() => searchWeb(ord[clampCar].id)} onArticle={() => loadArticleImgs(ord[clampCar].id)} onUpload={(f) => onUploadFile(ord[clampCar].id, f)}
              onPick={(u, k) => pickExternal(ord[clampCar].id, u, k)} onRemove={(i) => removePhoto(ord[clampCar].id, i)} onCover={(i) => makeCover(ord[clampCar].id, i)}
              onLock={() => { setPost(ord[clampCar].id, { imgLocked: true }); setCarIdx(nextUnlocked("imgLocked")); }} onEdit={() => setPost(ord[clampCar].id, { imgLocked: false })} />}
            <div className="thumbstrip">{ord.map((c, i) => <div key={c.id} className={"cthumb " + (i === clampCar ? "on " : "") + (posts[c.id].imgLocked ? "done" : "")} onClick={() => setCarIdx(i)}><span className="dot" style={{ background: c.color, border: "1px solid #777", display: "inline-block", width: 8, height: 8, borderRadius: "50%" }} />{c.name}<span className="st">{posts[c.id].imgLocked ? "✓" : ""}</span></div>)}</div>
            <div className="navrow">
              <button className="btn ghost sm" onClick={() => { ord.forEach((c) => setPost(c.id, { locked: false })); setCarIdx(0); setStep(3); }}>← Back</button>
              <button className="btn" disabled={!ord.every((c) => posts[c.id].imgLocked)} onClick={() => { setCarIdx(0); setStep(5); }}>Next: Publish →</button>
            </div>
          </>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <>
            <div className="head"><h2>Publish</h2><div className="sub">Export-first: download the images and copy the caption.</div></div>
            <div className="subgrid">
              {ord.map((c) => {
                const p = posts[c.id];
                return (
                  <div className="subbox" key={c.id}>
                    <h4><span className="dot" style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: c.color, border: "1px solid #777" }} />{c.name}<span className="chip">{c.tone}</span>{p.photos.length > 1 && <span className="chip">{p.photos.length} ảnh</span>}</h4>
                    <div className="canvas-wrap" style={{ padding: 8, margin: "8px 0", cursor: "pointer" }} onClick={() => downloadAll(c.id)} title="Tap to download"><CoverCanvas id={"cv5_" + c.id} post={p} source={article?.source || ""} /></div>
                    <div className="fieldlab">Title <span className="retry" onClick={() => copy(p.title)} title="Copy title">⧉</span></div>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.title}</div>
                    <div className="fieldlab">Caption + hashtags + CTA <span className="retry" onClick={() => copy(fullText(p))} title="Copy all">⧉</span></div>
                    <div className="muted" style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.55 }}>{fullText(p)}</div>
                    <div className="subactions" style={{ justifyContent: "center" }}><button className="btn mini" onClick={() => downloadAll(c.id)}>⬇ Download {p.photos.length > 1 ? `(${p.photos.length})` : ""}</button><button className="btn ghost mini" onClick={() => copy(fullText(p))}>⧉ Copy</button></div>
                  </div>
                );
              })}
            </div>
            <div className="navrow">
              <button className="btn ghost sm" onClick={() => { ord.forEach((c) => setPost(c.id, { imgLocked: false })); setCarIdx(0); setStep(4); }}>← Back</button>
              <button className="btn" onClick={() => { setArticle(null); setSelected([]); setPosts({}); setStep(1); }}>✓ Done</button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 3 subbox ---------- */
function Subbox3({ post, setPost, onLock, onEdit, onRemove, onRegen, busy }: {
  post: Post; setPost: (id: string, p: Partial<Post>) => void; onLock: () => void; onEdit: () => void; onRemove: () => void; onRegen: () => void; busy: boolean;
}) {
  const p = post, id = p.ch.id;
  const dot = <span className="dot" style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: p.ch.color, border: "1px solid #777" }} />;
  if (p.locked) {
    return (
      <div className="subbox locked"><span className="x" onClick={onRemove}>✕</span>
        <h4>{dot}{p.ch.name}<span className="locktag">Saved</span></h4>
        <div style={{ fontWeight: 600, fontSize: 13, margin: "6px 0" }}>{p.title}</div>
        <div className="muted" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{p.caption}</div>
        <div className="tagrow" style={{ marginTop: 8 }}>{[...p.lockedTags, ...p.autoTags].map((t, i) => <span key={i} className="ftag" style={{ opacity: .8 }}>{t}</span>)}</div>
        {p.includeCTA && <div className="muted" style={{ marginTop: 4 }}>{p.cta}</div>}
        <div className="subactions"><button className="btn ghost mini" onClick={onEdit}>Edit</button></div>
      </div>
    );
  }
  return (
    <div className="subbox"><span className="x" onClick={onRemove} title="Remove channel">✕</span>
      <h4>{dot}{p.ch.name}<span className="chip">{p.ch.tone}</span></h4>
      <div className="fieldlab">Title <span className="retry" onClick={() => setPost(id, { titleIdx: (p.titleIdx + 1) % p.titles.length, title: p.titles[(p.titleIdx + 1) % p.titles.length] })}>↻</span></div>
      <input className="mini" value={p.title} onChange={(e) => setPost(id, { title: e.target.value })} />
      <div className="fieldlab">Caption <span className="retry" onClick={onRegen}>{busy ? "…" : "↻"}</span></div>
      <textarea className="mini autogrow" value={p.caption} onChange={(e) => setPost(id, { caption: e.target.value })} />
      <div className="fieldlab">Hashtags <span className="retry" onClick={() => setPost(id, { autoTags: autoTagsFor({ category: "" } as Article, Math.floor(Math.random() * 3)) })}>↻</span></div>
      <div className="taginput"><span className="faded">{p.lockedTags.join(" ")}</span><input value={p.autoTags.join(" ")} onChange={(e) => setPost(id, { autoTags: e.target.value.split(/\s+/).filter(Boolean) })} /></div>
      <div className="fieldlab">CTA</div>
      <div className="ctarow"><input type="checkbox" checked={p.includeCTA} onChange={(e) => setPost(id, { includeCTA: e.target.checked })} /><input className="mini" value={p.cta} onChange={(e) => setPost(id, { cta: e.target.value })} style={p.includeCTA ? {} : { opacity: .4 }} /></div>
      <div className="subactions"><button className="btn mini" onClick={onLock}>✓ Save</button></div>
    </div>
  );
}

/* ---------- Step 4 card ---------- */
function Card4({ post, source, setPost, onSearch, onArticle, onUpload, onPick, onRemove, onCover, onLock, onEdit }: {
  post: Post; source: string; setPost: (id: string, p: Partial<Post>) => void;
  onSearch: () => void; onArticle: () => void; onUpload: (f?: File) => void;
  onPick: (url: string, kind: "web" | "article") => void; onRemove: (i: number) => void; onCover: (i: number) => void;
  onLock: () => void; onEdit: () => void;
}) {
  const p = post, id = p.ch.id, ch = p.ch;
  const dot = <span className="dot" style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: ch.color, border: "1px solid #777" }} />;
  const preview = <div style={{ minWidth: 300, flex: "0 0 auto" }}><PostPreview id={"cv4_" + id} post={p} source={source} onToggleCap={() => setPost(id, { capOpen: !p.capOpen })} /></div>;

  if (p.imgLocked) {
    return (
      <div className="card" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 200 }}><h4 style={{ margin: "0 0 4px" }}>{dot} {ch.name} <span className="locktag">Image saved · {p.photos.length} ảnh</span></h4>
          <button className="btn ghost mini" style={{ marginTop: 10 }} onClick={onEdit}>Edit image</button></div>
        {preview}
      </div>
    );
  }
  const swatches = ["#000000", "#ffffff", ch.color, "#f59e0b", "#ef4444"];
  const sizes: ("s" | "m" | "l")[] = ["s", "m", "l"]; const szl = { s: "S", m: "M", l: "L" };
  const full = p.photos.length >= MAX_PHOTOS;
  return (
    <div className="card">
      <h4 style={{ margin: "0 0 12px" }}>{dot} {ch.name} <span className="chip">{ch.tone}</span></h4>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          {/* selected photos */}
          <label>Photos ({p.photos.length}/{MAX_PHOTOS}){p.picking && <span className="muted"> · loading…</span>}</label>
          <div className="gallery">
            {p.photos.map((ph, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={i} className="thumb" style={{ backgroundImage: `url(${ph.img.src})`, backgroundSize: "cover" }} title={i === 0 ? "Cover" : "Click to make cover"} onClick={() => onCover(i)}>
                {i === 0 && <span className="ref" style={{ background: "#fff", color: "#000" }}>Cover</span>}
                <span onClick={(e) => { e.stopPropagation(); onRemove(i); }} style={{ position: "absolute", top: 2, right: 4, color: "#fff", textShadow: "0 0 3px #000", cursor: "pointer" }}>✕</span>
              </div>
            ))}
            {p.photos.length === 0 && <div className="muted" style={{ gridColumn: "1/-1" }}>No photos yet — add up to {MAX_PHOTOS}.</div>}
          </div>

          <label>Add photo {full && <span className="muted">(max reached)</span>}</label>
          <div className="toolbar" style={{ marginTop: 4, opacity: full ? .4 : 1, pointerEvents: full ? "none" : "auto" }}>
            <button className="btn ghost sm" style={p.srcMode === "article" ? { borderColor: "#fff" } : {}} onClick={onArticle}>📄 Article</button>
            <label className="btn ghost sm" style={{ cursor: "pointer" }}>⬆️ Upload<input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={(e) => onUpload(e.target.files?.[0])} /></label>
            <button className="btn ghost sm" style={{ opacity: .7, ...(p.srcMode === "web" ? { borderColor: "#fff" } : {}) }} onClick={() => setPost(id, { srcMode: "web" })} title="Beta — Google deprecated full-web search">🔍 Web <span style={{ fontSize: 9, border: "1px solid var(--line)", borderRadius: 6, padding: "0 4px", marginLeft: 2 }}>beta</span></button>
          </div>
          {p.srcMode === "web" && !full && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", gap: 7 }}><input className="mini" placeholder="Search photos…" value={p.query} onChange={(e) => setPost(id, { query: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }} /><button className="btn mini" onClick={onSearch}>Search</button></div>
              <div className="muted" style={{ marginTop: 6 }}>⚠️ Beta — Google bỏ tìm toàn web; chỉ ra kết quả khi CSE giới hạn trong các site cụ thể. Reference only.</div>
              <div className="resgrid">{p.webResults.map((r, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <div key={i} className="res" style={{ backgroundImage: `url(${r.thumb})`, backgroundSize: "cover" }} onClick={() => onPick(r.url, "web")} title="Add" />
              ))}</div>
            </div>
          )}
          {p.srcMode === "article" && !full && (
            <div style={{ marginTop: 8 }}><div className="muted">From article · reference only{p.articleImages.length === 0 ? " · (none found / site blocked)" : ""}</div>
              <div className="resgrid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>{p.articleImages.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <div key={i} className="res" style={{ backgroundImage: `url(${u})`, backgroundSize: "cover" }} onClick={() => onPick(u, "article")} title="Add"><span className="rb">Ref</span></div>
              ))}</div>
            </div>
          )}

          <label>Cover frame</label>
          <div>{(["premade", "black", "custom"] as const).map((f) => <span key={f} className={"pill " + (p.frame === f ? "sel" : "")} onClick={() => setPost(id, { frame: f })}>{f === "premade" ? "Channel" : f === "black" ? "Black" : "Custom"}</span>)}</div>
          <label>Frame color {!ch.allowColor && <span className="muted">(locked)</span>}</label>
          <div style={ch.allowColor ? {} : { opacity: .4, pointerEvents: "none" }}>{swatches.map((c) => <span key={c} className={"swatch " + (p.frameColor === c ? "sel" : "")} style={{ background: c }} onClick={() => setPost(id, { frameColor: c })} />)}</div>
          <label>Title on cover</label>
          <input className="mini" value={p.imgTitle} placeholder={p.title} onChange={(e) => setPost(id, { imgTitle: e.target.value })} />
          <div className="toolbar" style={{ marginTop: 7, alignItems: "center" }}>
            <span className="muted">Size</span>{sizes.map((s) => <button key={s} className={"tbtn " + (p.titleSize === s ? "on" : "")} onClick={() => setPost(id, { titleSize: s })}>{szl[s]}</button>)}
            <span className="muted" style={{ marginLeft: 6 }}>Color</span>
            <span className={"swatch " + (p.titleColor === "#ffffff" ? "sel" : "")} style={{ background: "#fff", width: 22, height: 22 }} onClick={() => setPost(id, { titleColor: "#ffffff" })} />
            <span className={"swatch " + (p.titleColor === "#000000" ? "sel" : "")} style={{ background: "#000", width: 22, height: 22 }} onClick={() => setPost(id, { titleColor: "#000000" })} />
          </div>
          <label className="ck"><input type="checkbox" checked={p.logo} onChange={(e) => setPost(id, { logo: e.target.checked })} /> Show logo</label>
          <div className="subactions"><button className="btn mini" onClick={onLock}>✓ Save image</button></div>
        </div>
        {preview}
      </div>
    </div>
  );
}
