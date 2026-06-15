// add-sources.mjs — thêm RSS sources mới vào Firestore
// Chạy: node add-sources.mjs
// Cần .env.local ở cùng thư mục gốc project (hoặc set env vars thủ công)

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env.local thủ công
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

const NEW_SOURCES = [
  // --- Direct RSS feeds ---
  {
    id: "tiin-sao",
    name: "Tiin.vn – Sao",
    rssUrl: "https://tiin.vn/rss/sao.rss",
    credibility: 6,
    active: true,
  },
  {
    id: "yeah1",
    name: "Yeah1",
    rssUrl: "https://yeah1.com/feed",
    credibility: 6,
    active: true,
  },
  {
    id: "kenh14-cine",
    name: "Kenh14 – Cine",
    rssUrl: "https://kenh14.vn/rss/cine.rss",
    credibility: 8,
    active: true,
  },
  {
    id: "kenh14-musik",
    name: "Kenh14 – Musik",
    rssUrl: "https://kenh14.vn/rss/musik.rss",
    credibility: 8,
    active: true,
  },

  // --- Facebook pages via rss.app ---
  {
    id: "theanh28-ent",
    name: "Theanh28 Entertainment",
    rssUrl: "https://rss.app/feeds/VZEzLw2ZfwetzehS.xml",
    credibility: 7,
    active: true,
  },
  {
    id: "theanh28-trending",
    name: "Theanh28 Trending",
    rssUrl: "https://rss.app/feeds/pj7QFql2RMMTvamG.xml",
    credibility: 7,
    active: true,
  },
  {
    id: "bmsb",
    name: "Bí Mật Showbiz",
    rssUrl: "https://rss.app/feeds/mj5uWZ3ZVxXmYBHp.xml",
    credibility: 5,
    active: true,
  },
  {
    id: "hhsb",
    name: "Hóng hớt Showbiz",
    rssUrl: "https://rss.app/feeds/HKmRHq8QdFHaMqzW.xml",
    credibility: 5,
    active: true,
  },
  {
    id: "thisismohon",
    name: "This is mỏ hỗn",
    rssUrl: "https://rss.app/feeds/3z3YmFjGu7OSmpb1.xml",
    credibility: 5,
    active: true,
  },
  {
    id: "batamshowbiz",
    name: "Bà tám showbiz",
    rssUrl: "https://rss.app/feeds/cgx7Ho2AHabaFZbv.xml",
    credibility: 5,
    active: true,
  },
  {
    id: "mantv",
    name: "ManTV",
    rssUrl: "https://rss.app/feeds/fua8inbA9M7l1W0A.xml",
    credibility: 6,
    active: true,
  },
  {
    id: "batshowbiz",
    name: "Bậtshowbiz",
    rssUrl: "https://rss.app/feeds/aIMy2mFqHDnH4uFB.xml",
    credibility: 5,
    active: true,
  },
  {
    id: "daigenz",
    name: "Đài tiếng nói GenZ",
    rssUrl: "https://rss.app/feeds/MEjhTHK8VEUy1Ptz.xml",
    credibility: 5,
    active: true,
  },
  {
    id: "sunseeshowbiz",
    name: "Sunsee Showbiz",
    rssUrl: "https://rss.app/feeds/TaaztXbvnrLPIJW9.xml",
    credibility: 5,
    active: true,
  },
];

const col = db.collection("config").doc("sources").collection("items");

let added = 0, skipped = 0;
for (const src of NEW_SOURCES) {
  const ref = col.doc(src.id);
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`⏭  skip  ${src.id} (already exists)`);
    skipped++;
  } else {
    await ref.set(src);
    console.log(`✅ added  ${src.id} — ${src.name}`);
    added++;
  }
}

console.log(`\nDone: ${added} added, ${skipped} skipped.`);
process.exit(0);
