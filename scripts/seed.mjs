/**
 * Seed Firestore with the 8 real KÊNH VỆ TINH channels + news sources.
 * Run once after configuring .env.local:   npm run seed
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
  {
    id: "fb-theo-chan-nghe-si",
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
    writingDo: ["Mở đầu bằng 'Hôm nay [tên nghệ sĩ] đã...' theo kiểu nhật ký", "Viết như người bạn kể chuyện, gần gũi, ấm áp", "Dùng ảnh hậu trường, candid, sinh hoạt đời thường"],
    writingDont: ["Không viết theo giọng báo chí khô khan", "Không dùng ngôn ngữ PR cứng nhắc", "Không thiếu tên nghệ sĩ trong câu đầu tiên"],
  },
  {
    id: "fb-bung-no-showbiz",
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
    writingDo: ["Dùng ALL CAPS cho từ khóa chính: 'ĐỈNH QUÁ!', 'SOLD OUT rồi'", "Năng lượng cao, dấu chấm than nhiều", "Mở đầu bằng tin hot nhất, không vòng vo"],
    writingDont: ["Không viết dài dòng — phải nhanh và gọn", "Không dùng giọng bình thản", "Không bỏ qua emoji và dấu chấm than"],
  },
  {
    id: "fb-showbiz-khong-giau",
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
    writingDo: ["Đưa đủ 5W trong 3 câu đầu: Ai, Cái gì, Ở đâu, Khi nào, Tại sao", "Trích nguồn rõ ràng", "Ngắn gọn, súc tích — đọc xong biết ngay chuyện gì xảy ra"],
    writingDont: ["Không drama hoá, không dùng từ cảm tính như 'sốc'", "Không bình luận cảm tính hay phán xét nghệ sĩ", "Không đăng tin chưa có nguồn xác nhận"],
  },
  {
    id: "fb-ngac-nhien-chua",
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
    writingDo: ["Mở đầu bằng câu gây sốc: 'Ủa cái này có thật không?', 'Ai ngờ được chứ!'", "Post ngắn, ảnh to — không quá 3 câu", "Kết bằng 'Tag bạn bè ngay!'"],
    writingDont: ["Không viết dài — phải ngắn và punch ngay từ đầu", "Không dùng giọng nghiêm túc hay formal", "Không thiếu yếu tố gây phản ứng cảm xúc"],
  },
  {
    id: "fb-sau-bit-co-zi",
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
    writingDo: ["Dẫn dắt bằng chi tiết gợi tò mò, không nói thẳng kết luận", "Dùng: 'Lạ nhỉ...', 'Đúng lúc quá...', 'Trùng hợp hay có chủ ý?'", "Caption ngắn, cay, kết bằng câu hỏi bỏ lửng"],
    writingDont: ["Không kết luận thẳng — để người đọc tự suy", "Không quá aggressive hoặc tấn công cá nhân", "Không viết dài dòng"],
  },
  {
    id: "ig-lets-have-fun",
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
    writingDo: ["Giọng hài hước — drama mà vẫn cười được", "Caption ngắn, dí dỏm, dùng tiếng lóng Gen Z tự nhiên", "Kết bằng câu đùa hoặc câu hỏi vui"],
    writingDont: ["Không quá cay độc hoặc công kích cá nhân", "Không viết dài — IG cần ngắn và punch", "Không dùng giọng nghiêm túc hay báo chí"],
  },
  {
    id: "ig-1000-nghiep",
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
    writingDo: ["Mở đầu bằng góc nhìn karma: 'Gieo nhân nào, gặt quả nấy...'", "Triết lý nhẹ pha drama — không phán xét thẳng", "Tone bình thản, chậm rãi — như người đứng ngoài quan sát"],
    writingDont: ["Không hype quá hoặc dùng ALL CAPS", "Không phán xét trực tiếp — để người đọc tự kết luận", "Không dùng slang Gen Z — giữ tone trưởng thành"],
  },
];

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
  { id: "tiin-sao", name: "Tiin – Sao", rssUrl: "https://tiin.vn/rss/sao.rss", credibility: 6, active: true },
  { id: "yeah1", name: "Yeah1", rssUrl: "https://yeah1.com/feed", credibility: 6, active: true },
  { id: "kenh14-cine", name: "Kenh14 – Cine", rssUrl: "https://kenh14.vn/rss/cine.rss", credibility: 8, active: true },
  { id: "kenh14-musik", name: "Kenh14 – Musik", rssUrl: "https://kenh14.vn/rss/musik.rss", credibility: 8, active: true },
  // Facebook fanpages via rss.app proxy
  { id: "fb-theanh28", name: "Theanh28 Entertainment", rssUrl: "https://rss.app/feeds/VZEzLw2ZfwetzehS.xml", credibility: 7, active: true },
  { id: "fb-theanh28-trending", name: "Theanh28 Trending", rssUrl: "https://rss.app/feeds/pj7QFql2RMMTvamG.xml", credibility: 7, active: true },
  { id: "fb-bi-mat-showbiz", name: "Bí Mật Showbiz", rssUrl: "https://rss.app/feeds/mj5uWZ3ZVxXmYBHp.xml", credibility: 6, active: true },
  { id: "fb-hong-hot-showbiz", name: "Hóng hớt Showbiz", rssUrl: "https://rss.app/feeds/HKmRHq8QdFHaMqzW.xml", credibility: 6, active: true },
  { id: "fb-this-is-mo-hon", name: "This is mỏ hỗn", rssUrl: "https://rss.app/feeds/3z3YmFjGu7OSmpb1.xml", credibility: 5, active: true },
  { id: "fb-ba-tam-showbiz", name: "Bà tám showbiz", rssUrl: "https://rss.app/feeds/cgx7Ho2AHabaFZbv.xml", credibility: 6, active: true },
  { id: "fb-mantv", name: "ManTV", rssUrl: "https://rss.app/feeds/fua8inbA9M7l1W0A.xml", credibility: 6, active: true },
  { id: "fb-bat-showbiz", name: "Bậtshowbiz", rssUrl: "https://rss.app/feeds/aIMy2mFqHDnH4uFB.xml", credibility: 5, active: true },
  { id: "fb-dai-tieng-noi-genz", name: "Đài tiếng nói GenZ", rssUrl: "https://rss.app/feeds/MEjhTHK8VEUy1Ptz.xml", credibility: 5, active: true },
  { id: "fb-sunsee-showbiz", name: "Sunsee Showbiz", rssUrl: "https://rss.app/feeds/TaaztXbvnrLPIJW9.xml", credibility: 6, active: true },
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
