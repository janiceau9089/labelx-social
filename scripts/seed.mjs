/**
 * Seed Firestore with starter channels + news sources.
 * Run once after configuring .env.local:   npm run seed
 * Requires the FIREBASE_* admin vars (service account) in .env.local.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const channels = [
  { id: "fb1", name: "LabelX Music", platform: "FB", tone: "Premium editorial", age: "25-40", color: "#ffffff", allowColor: false, tags: ["#LabelXMusic", "#Vpop", "#LabelX"], cta: "👉 Theo dõi LabelX để cập nhật thông tin mới nhất" },
  { id: "fb2", name: "Vpop Daily", platform: "FB", tone: "Gen Z casual", age: "16-24", color: "#22c55e", allowColor: true, tags: ["#VpopDaily", "#Vpop", "#LabelX"], cta: "👉 Follow ngay để không bỏ lỡ tin hot nha!" },
  { id: "ig1", name: "@labelx", platform: "IG", tone: "Premium editorial", age: "18-30", color: "#ffffff", allowColor: false, tags: ["#labelx", "#Vpop", "#Music"], cta: "👉 Theo dõi LabelX để cập nhật thông tin mới nhất" },
];

// Vietnamese entertainment/showbiz RSS feeds. The collector skips any feed that
// fails, so a few dead URLs are harmless — the working ones populate the board.
// Curate/extend in /admin (Add source). Some sites need scraping (no RSS).
const sources = [
  { id: "vnexpress", name: "VnExpress Giải Trí", rssUrl: "https://vnexpress.net/rss/giai-tri.rss", credibility: 9, active: true },
  { id: "ngoisao", name: "Ngôi Sao", rssUrl: "https://ngoisao.vnexpress.net/rss/ngoi-sao.rss", credibility: 7, active: true },
  { id: "tuoitre", name: "Tuổi Trẻ Giải Trí", rssUrl: "https://tuoitre.vn/rss/giai-tri.rss", credibility: 9, active: true },
  { id: "thanhnien", name: "Thanh Niên Giải Trí", rssUrl: "https://thanhnien.vn/rss/giai-tri.rss", credibility: 8, active: true },
  { id: "dantri", name: "Dân Trí Giải Trí", rssUrl: "https://dantri.com.vn/giai-tri.rss", credibility: 8, active: true },
  { id: "vietnamnet", name: "VietnamNet Giải Trí", rssUrl: "https://vietnamnet.vn/rss/giai-tri.rss", credibility: 8, active: true },
  { id: "nld", name: "Người Lao Động VH-VN", rssUrl: "https://nld.com.vn/van-hoa-van-nghe.rss", credibility: 7, active: true },
  { id: "laodong", name: "Lao Động VH-GT", rssUrl: "https://laodong.vn/rss/van-hoa-giai-tri.rss", credibility: 7, active: true },
  { id: "tienphong", name: "Tiền Phong Giải Trí", rssUrl: "https://tienphong.vn/rss/giai-tri-72.rss", credibility: 7, active: true },
  { id: "vtcnews", name: "VTC News VH-GT", rssUrl: "https://vtcnews.vn/rss/van-hoa-giai-tri.rss", credibility: 7, active: true },
  { id: "24h", name: "24h Giải Trí - Sao", rssUrl: "https://www.24h.com.vn/upload/rss/giaitrisao.rss", credibility: 6, active: true },
  { id: "kenh14", name: "Kenh14 Star", rssUrl: "https://kenh14.vn/star.rss", credibility: 7, active: true },
  { id: "soha", name: "Soha Giải Trí", rssUrl: "https://soha.vn/giai-tri.rss", credibility: 6, active: true },
  { id: "afamily", name: "aFamily Giải Trí", rssUrl: "https://afamily.vn/giai-tri.rss", credibility: 6, active: true },
  { id: "znews", name: "Znews Giải Trí", rssUrl: "https://znews.vn/giai-tri.rss", credibility: 7, active: true },
  { id: "zingnews-music", name: "Znews Âm Nhạc", rssUrl: "https://znews.vn/am-nhac.rss", credibility: 7, active: true },
  { id: "vietnamplus", name: "VietnamPlus Văn Hóa", rssUrl: "https://www.vietnamplus.vn/rss/vanhoa.rss", credibility: 7, active: true },
  { id: "phapluat", name: "Pháp Luật TP Giải Trí", rssUrl: "https://plo.vn/rss/van-hoa-giai-tri-1124.rss", credibility: 6, active: true },
];

async function main() {
  for (const c of channels) {
    await db.collection("config").doc("channels").collection("items").doc(c.id).set(c);
  }
  for (const s of sources) {
    await db.collection("config").doc("sources").collection("items").doc(s.id).set(s);
  }
  console.log(`Seeded ${channels.length} channels and ${sources.length} sources.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
