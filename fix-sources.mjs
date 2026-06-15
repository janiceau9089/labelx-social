// fix-sources.mjs — cập nhật RSS URLs bị lỗi
// Chạy: npx tsx fix-sources.mjs

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), ".env.local");
const env = readFileSync(envPath, "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  }),
});

const db = getFirestore();
const col = db.collection("config").doc("sources").collection("items");

// Sources cần update URL mới, hoặc disable nếu không tìm được RSS
const UPDATES = [
  // Fix URL mới
  { id: "dantri",      rssUrl: "https://dantri.com.vn/giai-tri.rss",                    active: true  },
  { id: "afamily",     rssUrl: "https://afamily.vn/rss/giai-tri.rss",                   active: true  },
  { id: "soha",        rssUrl: "https://soha.vn/rss/giai-tri.rss",                      active: true  },
  { id: "vtcnews",     rssUrl: "https://vtcnews.vn/rss/van-hoa-giai-tri.rss",           active: true  },
  { id: "24h",         rssUrl: "https://www.24h.com.vn/upload/rss/thoisu.rss",          active: true  },
  { id: "nld",         rssUrl: "https://nld.com.vn/rss/giai-tri.rss",                   active: true  },
  { id: "laodong",     rssUrl: "https://laodong.vn/rss/van-hoa-giai-tri.rss",           active: true  },
  { id: "tienphong",   rssUrl: "https://tienphong.vn/rss/van-hoa.rss",                  active: true  },
  { id: "vietnamplus", rssUrl: "https://www.vietnamplus.vn/rss/van-hoa.rss",            active: true  },
  { id: "zingnews-music", rssUrl: "https://zingnews.vn/rss/am-nhac.rss",               active: true  },
  { id: "znews",       rssUrl: "https://znews.vn/rss/giai-tri.rss",                     active: true  },
  // Disable các source không có RSS chuẩn
  { id: "tiin-sao",    active: false },
  { id: "yeah1",       active: false },
  { id: "ngoisao",     active: false },
];

let updated = 0, skipped = 0;
for (const u of UPDATES) {
  const ref = col.doc(u.id);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`⏭  not found: ${u.id}`);
    skipped++;
    continue;
  }
  const patch = {};
  if (u.rssUrl !== undefined) patch.rssUrl = u.rssUrl;
  if (u.active !== undefined) patch.active = u.active;
  await ref.update(patch);
  const status = u.active === false ? "🔴 disabled" : "✅ updated ";
  console.log(`${status} ${u.id}${u.rssUrl ? " → " + u.rssUrl : ""}`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
process.exit(0);
