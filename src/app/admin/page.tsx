"use client";
/**
 * Admin (read-only starter). Shows the channels currently in Firestore.
 * Full CRUD (add/edit channels, styles, frames, logos, sources, safety rules)
 * is the main thing to build out here — wire forms to new /api/admin/* routes
 * that write via the Admin SDK and check isAdmin(). See README.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, authFetch } from "@/lib/useAuth";
import type { Channel } from "@/lib/types";

export default function Admin() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/"); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    authFetch(user, "/api/news").then(async (r) => {
      if (!r.ok) return;
      const d = await r.json();
      setChannels(d.channels || []); setIsAdmin(!!d.isAdmin);
    });
  }, [user]);

  if (!user) return <div className="wrap">Loading…</div>;

  return (
    <>
      <header>
        <div className="brand">✕ LABELX</div>
        <span className="muted">Admin</span>
        <div className="spacer" />
        <a className="btn ghost sm" href="/workflow">Workflow</a>
      </header>
      <div className="wrap">
        <h2>Channels</h2>
        {!isAdmin && <div className="card muted">You are signed in but not an admin. Editing is disabled.</div>}
        <div className="card" style={{ padding: 6 }}>
          {channels.map((c) => (
            <div className="item" key={c.id} style={{ cursor: "default" }}>
              <div style={{ flex: 1 }}>
                <div>{c.name} <span className="muted">{c.platform}</span></div>
                <div className="meta">
                  <span className="chip">{c.tone}</span>
                  <span className="chip">Age {c.age}</span>
                  <span className="chip">{(c.tags || []).join(" ")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="muted">
          To edit config, build forms here that POST to <code>/api/admin/*</code> routes
          (Admin-SDK writes guarded by <code>isAdmin()</code>). Seed data lives in <code>scripts/seed.mjs</code>.
        </p>
      </div>
    </>
  );
}
