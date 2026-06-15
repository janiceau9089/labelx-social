// fix-sources2.mjs — update URLs đúng + disable sources không có RSS
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

const UPDATES = [
  { id: "dantri",      rssUrl: "https://dantri.com.vn/rss/tam-diem.rss",              active: true  },
  { id: "soha",        rssUrl: "https://soha.vn/rss/home.rss",                        active: true  },
  { id: "24h",         rssUrl: "https://cdn.24h.com.vn/upload/rss/canhacmtv.rss",     active: true  },
  { id: "nld",         rssUrl: "https://nld.com.vn/rss/van-hoa-van-nghe.rss",         active: true  },
  { id: "tienphong",   rssUrl: "https://tienphong.vn/rss/am-nhac-153.rss",            active: true  },
  // Disable sources không tìm được RSS
  { id: "afamily",     active: false },
  { id: "vtcnews",     active: false },
  { id: "laodong",     active: false },
  { id: "vietnamplus", active: false },
  { id: "zingnews-music", active: false },
  { id: "znews",       active: false },
];

for (const u of UPDATES) {
  const ref = col.doc(u.id);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`⏭  not found: ${u.id}`); continue; }
  const patch = {};
  if (u.rssUrl) patch.rssUrl = u.rssUrl;
  patch.active = u.active;
  await ref.update(patch);
  const icon = u.active ? "✅ updated " : "🔴 disabled";
  console.log(`${icon} ${u.id}${u.rssUrl ? " → " + u.rssUrl : ""}`);
}

console.log("\nDone.");
process.exit(0);
