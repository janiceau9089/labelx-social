"use client";
/**
 * Admin — full CRUD for Channels (FB/IG pages) and News Sources.
 * Channels carry brand identity: name, platform, logo colour, frame style,
 * writing style (tone, do/don't rules, hashtags, CTA).
 * Sources carry RSS URL, credibility score, and active toggle.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, authFetch } from "@/lib/useAuth";
import type { Channel, NewsSource } from "@/lib/types";

/* ─── extended Channel type with brand identity fields ─── */
export interface BrandChannel extends Channel {
  logoInitial?: string;       // 1-2 char fallback if no logo URL
  logoUrl?: string;           // URL to uploaded logo (Firebase Storage path)
  frameStyle?: "solid" | "gradient" | "outline" | "none";
  writingDo?: string[];       // do rules for AI rewrite
  writingDont?: string[];     // don't rules for AI rewrite
  description?: string;       // internal note / audience description
}

/* ─── 8 real channels from KÊNH VỆ TINH ─── */
const PRESETS: Omit<BrandChannel, "id">[] = [
  {
    name: "Theo chân nghệ sĩ 24/7",
    platform: "FB",
    tone: "Storytelling / Nhật ký",
    age: "18-35",
    color: "#22c55e",
    allowColor: true,
    tags: ["#TheoChanNgheSi", "#HauTruong", "#NgheSi247"],
    cta: "👉 Theo dõi để không bỏ lỡ khoảnh khắc đời thường của thần tượng!",
    logoInitial: "TC",
    frameStyle: "solid",
    description: "Giọng kể chuyện, gần gũi như người bạn. Mỗi bài là câu chuyện nhỏ về cuộc sống, hậu trường, lịch hoạt động của nghệ sĩ.",
    writingDo: [
      "Mở đầu bằng 'Hôm nay [tên nghệ sĩ] đã...' theo kiểu nhật ký",
      "Viết như người bạn kể chuyện, gần gũi, ấm áp",
      "Dùng ảnh hậu trường, candid, sinh hoạt đời thường",
    ],
    writingDont: [
      "Không viết theo giọng báo chí khô khan",
      "Không dùng ngôn ngữ PR cứng nhắc",
      "Không thiếu tên nghệ sĩ trong câu đầu tiên",
    ],
  },
  {
    name: "Bùng nổ showbiz",
    platform: "FB",
    tone: "Hype / MC sân khấu",
    age: "16-30",
    color: "#ef4444",
    allowColor: true,
    tags: ["#BungNoShowbiz", "#Showbiz", "#DiemNongNgheSi"],
    cta: "🔥 Follow ngay để không miss tin hot nhất!",
    logoInitial: "BN",
    frameStyle: "gradient",
    description: "Giọng hype, năng lượng cao, như MC sân khấu. Chuyên tin sự kiện, concert, ra mắt album, MV. Format: đếm ngược, recap, highlight.",
    writingDo: [
      "Dùng ALL CAPS cho từ khóa chính: 'ĐỈNH QUÁ!', 'SOLD OUT rồi'",
      "Năng lượng cao, dấu chấm than nhiều, đếm ngược sự kiện",
      "Mở đầu bằng tin hot nhất, không vòng vo",
    ],
    writingDont: [
      "Không viết dài dòng — phải nhanh và gọn",
      "Không dùng giọng bình thản — luôn phải có năng lượng",
      "Không bỏ qua emoji và dấu chấm than",
    ],
  },
  {
    name: "Showbiz không giấu",
    platform: "FB",
    tone: "Trung lập / Báo tin nhanh",
    age: "20-40",
    color: "#3b82f6",
    allowColor: false,
    tags: ["#ShowbizKhongGiau", "#TinNhanh", "#Showbiz"],
    cta: "👉 Theo dõi để cập nhật tin showbiz nhanh nhất!",
    logoInitial: "SK",
    frameStyle: "solid",
    description: "Giọng trung lập, rõ ràng, đáng tin. Đưa tin nhanh đủ dữ kiện: ai, ở đâu, khi nào, nguồn từ đâu. Không drama hoá, không bình luận cảm tính.",
    writingDo: [
      "Đưa đủ 5W trong 3 câu đầu: Ai, Cái gì, Ở đâu, Khi nào, Tại sao",
      "Trích nguồn rõ ràng (theo [tên báo], theo [nghệ sĩ] chia sẻ...)",
      "Ngắn gọn, súc tích — đọc xong biết ngay chuyện gì xảy ra",
    ],
    writingDont: [
      "Không drama hoá, không dùng từ cảm tính như 'sốc', 'kinh hoàng'",
      "Không bình luận cảm tính hay phán xét nghệ sĩ",
      "Không đăng tin chưa có nguồn xác nhận",
    ],
  },
  {
    name: "Ngạc nhiên chưa",
    platform: "FB",
    tone: "Sốc + Hài / Viral",
    age: "16-28",
    color: "#f59e0b",
    allowColor: true,
    tags: ["#NgacNhienChua", "#ViralShowbiz", "#KhongNgoRa"],
    cta: "😱 Tag ngay người bạn cần biết tin này!",
    logoInitial: "NC",
    frameStyle: "gradient",
    description: "Giọng sốc + hài, đánh thẳng vào cảm xúc. Post ngắn, ảnh to, caption cay gọn. Dùng nhiều dấu hỏi, dấu chấm than, reaction meme.",
    writingDo: [
      "Mở đầu bằng câu gây sốc: 'Ủa cái này có thật không?', 'Ai ngờ được chứ!'",
      "Post ngắn, ảnh to — không quá 3 câu",
      "Kết bằng 'Tag bạn bè ngay!' hoặc câu hỏi kéo comment",
    ],
    writingDont: [
      "Không viết dài — phải ngắn và punch ngay từ đầu",
      "Không dùng giọng nghiêm túc hay formal",
      "Không thiếu yếu tố gây phản ứng cảm xúc",
    ],
  },
  {
    name: "Sâu bít có zì",
    platform: "FB",
    tone: "Tò mò / Mia mai nhẹ",
    age: "20-35",
    color: "#8b5cf6",
    allowColor: true,
    tags: ["#SauBitCoZi", "#GocNhinKhac", "#ShowbizSauSac"],
    cta: "🤔 Bạn nghĩ sao? Comment ý kiến bên dưới nhé!",
    logoInitial: "SB",
    frameStyle: "outline",
    description: "Giọng tò mò + mia mai nhẹ. Không bóc trực tiếp mà dẫn dắt để người đọc tự suy. Caption ngắn, cay, kết bằng câu hỏi bỏ lửng.",
    writingDo: [
      "Dẫn dắt bằng chi tiết gợi tò mò, không nói thẳng kết luận",
      "Dùng: 'Lạ nhỉ...', 'Đúng lúc quá...', 'Trùng hợp hay có chủ ý?'",
      "Caption ngắn, cay, kết bằng câu hỏi bỏ lửng",
    ],
    writingDont: [
      "Không kết luận thẳng — để người đọc tự suy",
      "Không quá aggressive hoặc tấn công cá nhân",
      "Không viết dài dòng — giữ sự bí ẩn",
    ],
  },
  {
    name: "Lets have fun sâu bít",
    platform: "IG",
    tone: "Hài hước / Gen Z nhẹ nhàng",
    age: "16-26",
    color: "#06b6d4",
    allowColor: true,
    tags: ["#LetsHaveFunSauBit", "#ShowbizHaiHuoc", "#Drama"],
    cta: "😂 Follow để cười mỗi ngày với drama showbiz!",
    logoInitial: "LH",
    frameStyle: "outline",
    description: "Giọng hài hước, nhẹ nhàng, không quá cay. Kiểu 'drama mà vẫn cười được'. Caption ngắn, dí dỏm, hay dùng tiếng lóng Gen Z.",
    writingDo: [
      "Giọng hài hước — drama mà vẫn cười được",
      "Caption ngắn, dí dỏm, dùng tiếng lóng Gen Z tự nhiên",
      "Kết bằng câu đùa hoặc câu hỏi vui",
    ],
    writingDont: [
      "Không quá cay độc hoặc công kích cá nhân",
      "Không viết dài — IG cần ngắn và punch",
      "Không dùng giọng nghiêm túc hay báo chí",
    ],
  },
  {
    name: "1000 nghiệp",
    platform: "IG",
    tone: "Triết lý nhẹ / Karma showbiz",
    age: "20-35",
    color: "#a855f7",
    allowColor: false,
    tags: ["#1000Nghiep", "#NghiepShowbiz", "#GieoNhanGatQua"],
    cta: "🙏 Nghiệp đến rồi, ai trả ai? Follow để xem tiếp!",
    logoInitial: "MN",
    frameStyle: "gradient",
    description: "Concept 'gieo nhân nào gặt quả nấy' — khai thác góc karma của showbiz. Caption triết lý nhẹ pha drama.",
    writingDo: [
      "Mở đầu bằng góc nhìn karma: 'Gieo nhân nào, gặt quả nấy...'",
      "Triết lý nhẹ pha drama — không phán xét thẳng",
      "Tone bình thản, chậm rãi — như người đứng ngoài quan sát",
    ],
    writingDont: [
      "Không hype quá hoặc dùng ALL CAPS",
      "Không phán xét trực tiếp — để người đọc tự kết luận",
      "Không dùng slang Gen Z — giữ tone trưởng thành",
    ],
  },
];

const FRAME_STYLES = [
  { value: "solid", label: "Solid fill" },
  { value: "gradient", label: "Gradient" },
  { value: "outline", label: "Outline" },
  { value: "none", label: "None" },
];

const CREDIBILITY_LABELS: Record<number, string> = {
  9: "Top-tier", 8: "High", 7: "Good", 6: "Moderate", 5: "Low", 4: "Poor",
};

function credLabel(n: number) {
  return CREDIBILITY_LABELS[n] ?? (n >= 8 ? "High" : n >= 6 ? "Moderate" : "Low");
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ─── colour swatch ─── */
const SWATCHES = ["#ffffff", "#a855f7", "#ec4899", "#f59e0b", "#06b6d4", "#8b5cf6", "#f97316", "#22c55e", "#ef4444", "#3b82f6"];

/* ============================================================
   CHANNEL FORM (add / edit)
   ============================================================ */
function ChannelForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<BrandChannel>;
  onSave: (c: BrandChannel) => Promise<void>;
  onCancel: () => void;
}) {
  const isNew = !initial?.id;
  const [f, setF] = useState<Partial<BrandChannel>>({
    name: "",
    platform: "FB",
    tone: "Premium editorial",
    age: "18-30",
    color: "#ffffff",
    allowColor: false,
    tags: [],
    cta: "",
    logoInitial: "",
    logoDataUrl: "",
    frameStyle: "solid",
    description: "",
    writingDo: [""],
    writingDont: [""],
    ...initial,
  });
  const [tagInput, setTagInput] = useState((initial?.tags || []).join(" "));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(key: keyof BrandChannel, val: unknown) {
    setF((p) => ({ ...p, [key]: val }));
  }

  function updateRule(kind: "writingDo" | "writingDont", idx: number, val: string) {
    const arr = [...(f[kind] || [])];
    arr[idx] = val;
    set(kind, arr);
  }
  function addRule(kind: "writingDo" | "writingDont") {
    set(kind, [...(f[kind] || []), ""]);
  }
  function removeRule(kind: "writingDo" | "writingDont", idx: number) {
    set(kind, (f[kind] || []).filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!f.name?.trim()) { setErr("Page name is required."); return; }
    setSaving(true);
    setErr("");
    try {
      const tags = tagInput.split(/\s+/).map((t) => t.trim()).filter(Boolean).map((t) => t.startsWith("#") ? t : "#" + t);
      await onSave({
        ...f,
        id: f.id || "ch_" + Date.now(),
        tags,
        writingDo: (f.writingDo || []).filter(Boolean),
        writingDont: (f.writingDont || []).filter(Boolean),
        logoInitial: f.logoInitial || initials(f.name || ""),
      } as BrandChannel);
    } catch (e: unknown) {
      setErr((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="head">
        <h2 style={{ fontSize: 17 }}>{isNew ? "Add channel" : "Edit channel"}</h2>
      </div>

      {/* Row 1: name + platform */}
      <div className="row" style={{ gap: 12 }}>
        <div className="col">
          <label>Page / account name</label>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. LabelX Music" />
        </div>
        <div className="col" style={{ maxWidth: 140 }}>
          <label>Platform</label>
          <select value={f.platform} onChange={(e) => set("platform", e.target.value as "FB" | "IG")}>
            <option value="FB">Facebook</option>
            <option value="IG">Instagram</option>
          </select>
        </div>
      </div>

      {/* Row 2: description */}
      <label>Description / audience note</label>
      <input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Who follows this page and why?" />

      {/* Row 3: tone + age */}
      <div className="row" style={{ gap: 12, marginTop: 2 }}>
        <div className="col">
          <label>Tone / voice</label>
          <input value={f.tone} onChange={(e) => set("tone", e.target.value)} placeholder="e.g. Gen Z casual, Premium editorial" />
        </div>
        <div className="col" style={{ maxWidth: 140 }}>
          <label>Audience age</label>
          <input value={f.age} onChange={(e) => set("age", e.target.value)} placeholder="18-30" />
        </div>
      </div>

      {/* Row 4: brand colour + frame + logo initial */}
      <div className="row" style={{ gap: 12, marginTop: 2 }}>
        <div className="col">
          <label>Brand colour</label>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
            {SWATCHES.map((s) => (
              <div
                key={s}
                className={"swatch" + (f.color === s ? " sel" : "")}
                style={{ background: s }}
                onClick={() => set("color", s)}
              />
            ))}
            <input
              type="color"
              value={f.color}
              onChange={(e) => set("color", e.target.value)}
              style={{ width: 32, height: 32, padding: 2, borderRadius: 8, border: "2px solid var(--line)", cursor: "pointer", background: "none" }}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, cursor: "pointer" }}>
            <input type="checkbox" style={{ width: "auto" }} checked={!!f.allowColor} onChange={(e) => set("allowColor", e.target.checked)} />
            Allow colour customisation per post
          </label>
        </div>
        <div className="col" style={{ maxWidth: 160 }}>
          <label>Frame style</label>
          <select value={f.frameStyle} onChange={(e) => set("frameStyle", e.target.value as BrandChannel["frameStyle"])}>
            {FRAME_STYLES.map((fs) => <option key={fs.value} value={fs.value}>{fs.label}</option>)}
          </select>
        </div>
        <div className="col" style={{ minWidth: 160 }}>
          <label>Logo image <span style={{ color: "var(--mut)", fontWeight: 400 }}>(optional)</span></label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* preview */}
            <div style={{
              width: 44, height: 44, borderRadius: f.platform === "IG" ? "50%" : 10,
              background: f.logoDataUrl ? "transparent" : (f.color || "#333"),
              border: "2px solid var(--line)", flexShrink: 0, overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 14, color: f.color === "#ffffff" ? "#000" : "#fff",
            }}>
              {f.logoDataUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={f.logoDataUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (f.logoInitial || initials(f.name || "AB"))}
            </div>
            <div style={{ flex: 1 }}>
              <label className="btn ghost sm" style={{ cursor: "pointer", display: "inline-block" }}>
                Upload
                <input
                  type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 200 * 1024) { alert("Logo must be under 200KB"); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => set("logoDataUrl", ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {f.logoDataUrl && (
                <button className="btn ghost sm" style={{ marginLeft: 6, color: "var(--danger)" }} onClick={() => set("logoDataUrl", "")}>Remove</button>
              )}
            </div>
          </div>
          <label style={{ marginTop: 10 }}>Initials fallback</label>
          <input
            value={f.logoInitial}
            onChange={(e) => set("logoInitial", e.target.value.slice(0, 2).toUpperCase())}
            placeholder={initials(f.name || "AB")}
            maxLength={2}
            style={{ textTransform: "uppercase", letterSpacing: 2 }}
          />
        </div>
      </div>

      {/* Hashtags */}
      <label>Brand hashtags <span style={{ color: "var(--mut)", fontWeight: 400 }}>(space-separated, # optional)</span></label>
      <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="#LabelX #Vpop #Music" />

      {/* CTA */}
      <label>Default CTA</label>
      <input value={f.cta} onChange={(e) => set("cta", e.target.value)} placeholder="👉 Follow for daily updates" />

      {/* Writing rules */}
      <div className="row" style={{ gap: 12, marginTop: 6 }}>
        {(["writingDo", "writingDont"] as const).map((kind) => (
          <div key={kind} className="col" style={{ minWidth: 200 }}>
            <label style={{ color: kind === "writingDo" ? "var(--ok)" : "var(--danger)" }}>
              {kind === "writingDo" ? "✓ Writing dos" : "✕ Writing don'ts"}
            </label>
            {(f[kind] || [""]).map((rule, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                <input
                  value={rule}
                  onChange={(e) => updateRule(kind, i, e.target.value)}
                  placeholder={kind === "writingDo" ? "Use formal Vietnamese" : "No slang"}
                  style={{ fontSize: 12.5 }}
                />
                <button
                  className="btn ghost sm"
                  onClick={() => removeRule(kind, i)}
                  style={{ padding: "7px 10px", opacity: (f[kind] || []).length > 1 ? 1 : 0.3 }}
                  disabled={(f[kind] || []).length <= 1}
                >✕</button>
              </div>
            ))}
            <button className="btn ghost sm" onClick={() => addRule(kind)} style={{ marginTop: 2 }}>+ Add rule</button>
          </div>
        ))}
      </div>

      {err && <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{err}</div>}

      <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
        <button className="btn" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save channel"}</button>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ============================================================
   SOURCE FORM (add / edit)
   ============================================================ */
function SourceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<NewsSource>;
  onSave: (s: NewsSource) => Promise<void>;
  onCancel: () => void;
}) {
  const isNew = !initial?.id;
  const [f, setF] = useState<Partial<NewsSource>>({
    name: "", rssUrl: "", credibility: 7, active: true, ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(key: keyof NewsSource, val: unknown) { setF((p) => ({ ...p, [key]: val })); }

  async function submit() {
    if (!f.name?.trim()) { setErr("Source name is required."); return; }
    if (!f.rssUrl?.trim()) { setErr("RSS URL is required."); return; }
    setSaving(true); setErr("");
    try {
      await onSave({ ...f, id: f.id || f.name!.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") } as NewsSource);
    } catch (e: unknown) { setErr((e as Error).message || "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="head"><h2 style={{ fontSize: 17 }}>{isNew ? "Add source" : "Edit source"}</h2></div>

      <label>Source name</label>
      <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kenh14 Star" />

      <label>RSS feed URL</label>
      <input value={f.rssUrl} onChange={(e) => set("rssUrl", e.target.value)} placeholder="https://kenh14.vn/star.rss" />

      <div className="row" style={{ gap: 12, marginTop: 2 }}>
        <div className="col">
          <label>Credibility score <span style={{ color: "var(--mut)", fontWeight: 400 }}>({f.credibility} — {credLabel(f.credibility ?? 7)})</span></label>
          <input
            type="range" min={1} max={10} value={f.credibility}
            onChange={(e) => set("credibility", Number(e.target.value))}
            style={{ padding: 0, border: "none", background: "none", cursor: "pointer" }}
          />
        </div>
        <div className="col" style={{ maxWidth: 130 }}>
          <label>Status</label>
          <select value={f.active ? "active" : "paused"} onChange={(e) => set("active", e.target.value === "active")}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {err && <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{err}</div>}

      <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
        <button className="btn" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save source"}</button>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ============================================================
   CHANNEL CARD
   ============================================================ */
function ChannelCard({ ch, onEdit, onDelete, canEdit }: { ch: BrandChannel; onEdit: () => void; onDelete: () => void; canEdit: boolean }) {
  const [delConfirm, setDelConfirm] = useState(false);
  const bc = ch as BrandChannel;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* colour bar */}
      <div style={{ height: 4, background: ch.color || "#fff", borderRadius: "14px 14px 0 0" }} />
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          {/* logo avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: ch.platform === "IG" ? "50%" : 12,
            background: bc.logoDataUrl ? "transparent" : (ch.color || "#fff"),
            color: ch.color === "#ffffff" ? "#000" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 15, fontFamily: "Wix Madefor Display, Inter, sans-serif",
            flexShrink: 0, border: "2px solid var(--line)", overflow: "hidden",
          }}>
            {bc.logoDataUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={bc.logoDataUrl} alt={ch.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (bc.logoInitial || initials(ch.name))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 7 }}>
              {ch.name}
              <span className="chip" style={{ borderColor: ch.platform === "IG" ? "#ec4899" : "#3b82f6", color: ch.platform === "IG" ? "#ec4899" : "#60a5fa" }}>{ch.platform}</span>
            </div>
            {bc.description && <div className="muted" style={{ marginTop: 2, fontSize: 12, lineHeight: 1.4 }}>{bc.description}</div>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span className="chip">{ch.tone}</span>
          <span className="chip">Age {ch.age}</span>
          {bc.frameStyle && bc.frameStyle !== "none" && <span className="chip">Frame: {bc.frameStyle}</span>}
        </div>

        <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 8 }}>
          {(ch.tags || []).join("  ")}
        </div>

        {/* writing rules preview */}
        {((bc.writingDo?.length ?? 0) > 0 || (bc.writingDont?.length ?? 0) > 0) && (
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            {(bc.writingDo || []).slice(0, 2).map((r, i) => (
              <span key={i} style={{ fontSize: 11, color: "var(--ok)", border: "1px solid rgba(127,212,154,.25)", borderRadius: 20, padding: "2px 9px" }}>✓ {r}</span>
            ))}
            {(bc.writingDont || []).slice(0, 1).map((r, i) => (
              <span key={i} style={{ fontSize: 11, color: "var(--danger)", border: "1px solid rgba(255,107,107,.25)", borderRadius: 20, padding: "2px 9px" }}>✕ {r}</span>
            ))}
          </div>
        )}

        {ch.cta && <div style={{ fontSize: 11.5, color: "var(--mut)", fontStyle: "italic", borderLeft: "2px solid var(--line)", paddingLeft: 9 }}>{ch.cta}</div>}

        {canEdit && (
          <div style={{ display: "flex", gap: 7, marginTop: 14 }}>
            <button className="btn ghost sm" onClick={onEdit}>Edit</button>
            {!delConfirm
              ? <button className="btn ghost sm" style={{ color: "var(--danger)", borderColor: "rgba(255,107,107,.3)" }} onClick={() => setDelConfirm(true)}>Delete</button>
              : (
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--danger)" }}>Sure?</span>
                  <button className="btn sm" style={{ background: "var(--danger)", color: "#fff" }} onClick={onDelete}>Yes, delete</button>
                  <button className="btn ghost sm" onClick={() => setDelConfirm(false)}>Cancel</button>
                </span>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SOURCE ROW
   ============================================================ */
function SourceRow({ src, onEdit, onToggle, onDelete, canEdit }: {
  src: NewsSource; onEdit: () => void; onToggle: () => void; onDelete: () => void; canEdit: boolean;
}) {
  const [delConfirm, setDelConfirm] = useState(false);
  return (
    <tr style={{ opacity: src.active ? 1 : 0.45 }}>
      <td style={{ fontWeight: 500 }}>{src.name}</td>
      <td style={{ color: "var(--mut)", fontSize: 12, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <a href={src.rssUrl} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{src.rssUrl}</a>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: `hsl(${(src.credibility - 1) * 12},70%,50%)` }} />
          <span style={{ fontSize: 12, color: "var(--mut)" }}>{src.credibility} — {credLabel(src.credibility)}</span>
        </div>
      </td>
      <td>
        <span className={src.active ? "f-ok flag" : "chip"}>{src.active ? "Active" : "Paused"}</span>
      </td>
      {canEdit && (
        <td>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn ghost mini" onClick={onToggle}>{src.active ? "Pause" : "Resume"}</button>
            <button className="btn ghost mini" onClick={onEdit}>Edit</button>
            {!delConfirm
              ? <button className="btn ghost mini" style={{ color: "var(--danger)", borderColor: "rgba(255,107,107,.3)" }} onClick={() => setDelConfirm(true)}>Delete</button>
              : <>
                <button className="btn mini" style={{ background: "var(--danger)", color: "#fff" }} onClick={onDelete}>Yes</button>
                <button className="btn ghost mini" onClick={() => setDelConfirm(false)}>No</button>
              </>
            }
          </div>
        </td>
      )}
    </tr>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
type Tab = "channels" | "sources";

export default function Admin() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("channels");
  const [channels, setChannels] = useState<BrandChannel[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // form state
  const [editingChannel, setEditingChannel] = useState<BrandChannel | null | "new">(null);
  const [editingSource, setEditingSource] = useState<NewsSource | null | "new">(null);
  const [presetsOpen, setPresetsOpen] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/"); }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    authFetch(user, "/api/news").then(async (r) => {
      if (!r.ok) return;
      const d = await r.json();
      setChannels(d.channels || []);
      setIsAdmin(!!d.isAdmin);
    });
    authFetch(user, "/api/admin/sources").then(async (r) => {
      if (!r.ok) return;
      const d = await r.json();
      setSources(d.sources || []);
    }).finally(() => setDataLoading(false));
  }, [user]);

  /* ── channel ops ── */
  async function saveChannel(ch: BrandChannel) {
    if (!user) return;
    const r = await authFetch(user, "/api/admin/channels", {
      method: ch.id && channels.find((c) => c.id === ch.id) ? "PUT" : "POST",
      body: JSON.stringify(ch),
    });
    if (!r.ok) throw new Error(await r.text());
    const updated = channels.find((c) => c.id === ch.id)
      ? channels.map((c) => (c.id === ch.id ? ch : c))
      : [...channels, ch];
    setChannels(updated);
    setEditingChannel(null);
  }

  async function deleteChannel(id: string) {
    if (!user) return;
    await authFetch(user, `/api/admin/channels?id=${id}`, { method: "DELETE" });
    setChannels((p) => p.filter((c) => c.id !== id));
  }

  /* ── source ops ── */
  async function saveSource(src: NewsSource) {
    if (!user) return;
    const isExisting = sources.find((s) => s.id === src.id);
    const r = await authFetch(user, "/api/admin/sources", {
      method: isExisting ? "PUT" : "POST",
      body: JSON.stringify(src),
    });
    if (!r.ok) throw new Error(await r.text());
    setSources((p) => isExisting ? p.map((s) => (s.id === src.id ? src : s)) : [...p, src]);
    setEditingSource(null);
  }

  async function toggleSource(src: NewsSource) {
    await saveSource({ ...src, active: !src.active });
  }

  async function deleteSource(id: string) {
    if (!user) return;
    await authFetch(user, `/api/admin/sources?id=${id}`, { method: "DELETE" });
    setSources((p) => p.filter((s) => s.id !== id));
  }

  async function addPreset(preset: Omit<BrandChannel, "id">) {
    const ch: BrandChannel = { ...preset, id: "ch_" + Date.now() };
    await saveChannel(ch);
  }

  if (!user) return <div className="wrap">Loading…</div>;

  const fbChannels = channels.filter((c) => c.platform === "FB");
  const igChannels = channels.filter((c) => c.platform === "IG");

  return (
    <>
      <header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/labelx.png" alt="LabelX" style={{ height: 26, display: "block" }} />
        <span className="muted">Admin</span>
        <div className="spacer" />
        <a className="btn ghost sm" href="/workflow">Workflow</a>
      </header>

      <div className="wrap">
        {!isAdmin && (
          <div className="card" style={{ borderColor: "rgba(230,180,80,.3)", marginBottom: 20 }}>
            <span style={{ color: "var(--warn)" }}>⚠ Read-only — your email is not in ADMIN_EMAILS. Editing is disabled.</span>
          </div>
        )}

        {/* tabs */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={"tab" + (tab === "channels" ? " on" : "")} onClick={() => setTab("channels")}>
            Channels <span style={{ marginLeft: 6, fontSize: 11, opacity: .6 }}>{channels.length}</span>
          </button>
          <button className={"tab" + (tab === "sources" ? " on" : "")} onClick={() => setTab("sources")}>
            News sources <span style={{ marginLeft: 6, fontSize: 11, opacity: .6 }}>{sources.length}</span>
          </button>
        </div>

        {/* ── CHANNELS TAB ── */}
        {tab === "channels" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2>Channels</h2>
                <div className="sub">FB pages and IG accounts — each carries its own brand identity and writing rules.</div>
              </div>
              {isAdmin && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn ghost sm" onClick={() => setPresetsOpen((p) => !p)}>
                    {presetsOpen ? "Hide presets" : "✦ Add from presets"}
                  </button>
                  <button className="btn sm" onClick={() => { setPresetsOpen(false); setEditingChannel("new"); }}>+ Add channel</button>
                </div>
              )}
            </div>

            {/* preset picker */}
            {presetsOpen && (
              <div className="card" style={{ marginBottom: 20, background: "var(--panel2)" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>8 suggested channels — click to add</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                  {PRESETS.map((p) => {
                    const alreadyAdded = channels.some((c) => c.name === p.name);
                    return (
                      <div
                        key={p.name}
                        className="card"
                        style={{ padding: "12px 14px", cursor: alreadyAdded ? "default" : "pointer", opacity: alreadyAdded ? 0.4 : 1, marginBottom: 0, borderColor: alreadyAdded ? "var(--hair)" : "var(--line)" }}
                        onClick={() => !alreadyAdded && addPreset(p)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: p.platform === "IG" ? "50%" : 9,
                            background: p.color, display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, fontSize: 12, color: p.color === "#ffffff" ? "#000" : "#fff",
                            flexShrink: 0, overflow: "hidden",
                          }}>
                            {p.logoInitial}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "var(--mut)" }}>{p.platform} · {p.tone}</div>
                          </div>
                          {alreadyAdded
                            ? <span className="chip" style={{ fontSize: 10 }}>Added</span>
                            : <span style={{ fontSize: 18, color: "var(--mut)" }}>+</span>}
                        </div>
                        {p.description && <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 6, lineHeight: 1.4 }}>{p.description}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* channel form */}
            {editingChannel && (
              <div style={{ marginBottom: 20 }}>
                <ChannelForm
                  initial={editingChannel === "new" ? {} : editingChannel}
                  onSave={saveChannel}
                  onCancel={() => setEditingChannel(null)}
                />
              </div>
            )}

            {dataLoading && <div className="muted">Loading…</div>}

            {!dataLoading && channels.length === 0 && !editingChannel && (
              <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--mut)" }}>
                No channels yet. Add from presets or create manually.
              </div>
            )}

            {/* FB section */}
            {fbChannels.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--mut)", textTransform: "uppercase", marginBottom: 10 }}>
                  Facebook · {fbChannels.length}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 24 }}>
                  {fbChannels.map((ch) => (
                    <ChannelCard
                      key={ch.id}
                      ch={ch}
                      canEdit={isAdmin}
                      onEdit={() => setEditingChannel(ch as BrandChannel)}
                      onDelete={() => deleteChannel(ch.id)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* IG section */}
            {igChannels.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--mut)", textTransform: "uppercase", marginBottom: 10 }}>
                  Instagram · {igChannels.length}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                  {igChannels.map((ch) => (
                    <ChannelCard
                      key={ch.id}
                      ch={ch}
                      canEdit={isAdmin}
                      onEdit={() => setEditingChannel(ch as BrandChannel)}
                      onDelete={() => deleteChannel(ch.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── SOURCES TAB ── */}
        {tab === "sources" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2>News sources</h2>
                <div className="sub">RSS feeds the hourly collector reads. Pause a source without deleting it.</div>
              </div>
              {isAdmin && <button className="btn sm" onClick={() => setEditingSource("new")}>+ Add source</button>}
            </div>

            {editingSource && (
              <div style={{ marginBottom: 20 }}>
                <SourceForm
                  initial={editingSource === "new" ? {} : editingSource}
                  onSave={saveSource}
                  onCancel={() => setEditingSource(null)}
                />
              </div>
            )}

            {dataLoading && <div className="muted">Loading…</div>}

            {!dataLoading && sources.length === 0 && !editingSource && (
              <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--mut)" }}>
                No sources. Add one above, or run <code>npm run seed</code> to populate defaults.
              </div>
            )}

            {sources.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>RSS URL</th>
                      <th>Credibility</th>
                      <th>Status</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((src) => (
                      <SourceRow
                        key={src.id}
                        src={src}
                        canEdit={isAdmin}
                        onEdit={() => setEditingSource(src)}
                        onToggle={() => toggleSource(src)}
                        onDelete={() => deleteSource(src.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="note" style={{ marginTop: 16 }}>
              <span>ℹ</span>
              <span>Sources are read every hour by the Vercel Cron job. Paused sources are skipped. Credibility affects article ranking — higher = appears higher in the news feed.</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
