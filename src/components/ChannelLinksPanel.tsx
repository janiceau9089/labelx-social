"use client";
/**
 * Collapsible left-side panel listing the 7 VanguardX-owned channels with
 * click-through links to their live FB/IG pages. Follower/like counts are
 * placeholders for now — wiring real numbers requires a Facebook Graph API
 * Page Access Token per page (Phase 2, see TODO below).
 *
 * Used on both /workflow and /admin. Renders nothing if there are no
 * channels with a pageUrl set, so it's safe to mount unconditionally.
 */
import { useState } from "react";

export type PanelChannel = {
  id: string;
  name: string;
  platform: "FB" | "IG";
  color: string;
  pageUrl?: string;
  logoDataUrl?: string;
  // TODO (Phase 2): wire real numbers via Facebook Graph API
  // (GET /{page-id}?fields=fan_count for FB, /{ig-user-id}?fields=followers_count for IG).
  // Requires a long-lived Page Access Token per page, stored server-side —
  // never expose tokens to the client. Until then this stays undefined and
  // the UI shows "—" instead of a fabricated number.
  followerCount?: number;
};

function formatCount(n?: number): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function ChannelLinksPanel({ channels }: { channels: PanelChannel[] }) {
  const [open, setOpen] = useState(true);
  const linked = channels.filter((c) => c.pageUrl);

  return (
    <div
      style={{
        position: "fixed", left: 0, top: 0, height: "100vh", zIndex: 15,
        display: "flex", alignItems: "stretch",
        pointerEvents: "none", // re-enabled on children so the rest of the page stays clickable
      }}
    >
      <div
        style={{
          width: open ? 220 : 0, overflow: "hidden", transition: "width .18s ease",
          background: "var(--panel)", borderRight: open ? "1px solid var(--hair)" : "none",
          pointerEvents: "auto", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 14px 10px", borderBottom: "1px solid var(--hair)", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "var(--mut)", letterSpacing: ".5px", textTransform: "uppercase" }}>Kênh vệ tinh</div>
          <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{linked.length}/{channels.length} đã gắn link</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
          {channels.length === 0 && (
            <div style={{ padding: 14, fontSize: 12.5, color: "var(--mut)" }}>Chưa có channel nào.</div>
          )}
          {channels.map((c) => (
            <ChannelRow key={c.id} ch={c} />
          ))}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--hair)", fontSize: 11, color: "var(--mut)", flexShrink: 0 }}>
          🔒 Followers: sắp có (cần Graph API token)
        </div>
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? "Thu gọn panel" : "Mở panel kênh"}
        style={{
          pointerEvents: "auto", alignSelf: "center",
          width: 22, height: 56, marginLeft: open ? 0 : 0,
          background: "var(--panel)", border: "1px solid var(--hair)", borderLeft: open ? "none" : "1px solid var(--hair)",
          borderRadius: open ? "0 8px 8px 0" : "8px",
          color: "var(--mut)", cursor: "pointer", fontSize: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {open ? "‹" : "›"}
      </button>
    </div>
  );
}

function ChannelRow({ ch }: { ch: PanelChannel }) {
  const avatar = ch.logoDataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ch.logoDataUrl} alt={ch.name} style={{ width: 30, height: 30, borderRadius: ch.platform === "IG" ? "50%" : 7, objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{
      width: 30, height: 30, borderRadius: ch.platform === "IG" ? "50%" : 7, flexShrink: 0,
      background: ch.color || "#333", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 800, color: ch.color === "#ffffff" ? "#000" : "#fff",
    }}>
      {initials(ch.name)}
    </div>
  );

  const inner = (
    <div style={{ display: "flex", gap: 9, alignItems: "center", padding: "8px 7px", borderRadius: 9 }}>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.name}</div>
        <div style={{ fontSize: 10.5, color: "var(--mut)", display: "flex", gap: 5, alignItems: "center" }}>
          <span>{ch.platform === "IG" ? "📷 IG" : "👍 FB"}</span>
          <span>·</span>
          <span>{formatCount(ch.followerCount)} followers</span>
        </div>
      </div>
      {ch.pageUrl && <span style={{ fontSize: 12, color: "var(--mut)", flexShrink: 0 }}>↗</span>}
    </div>
  );

  if (!ch.pageUrl) {
    return <div style={{ opacity: .45, cursor: "default" }} title="Chưa có link trang — thêm trong Admin">{inner}</div>;
  }
  return (
    <a
      href={ch.pageUrl} target="_blank" rel="noreferrer"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {inner}
    </a>
  );
}
