// add-page-urls.mjs — add pageUrl to channels
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}
initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY }) });
const db = getFirestore();
const col = db.collection("config").doc("channels").collection("items");

const PAGE_URLS = {
  "fb-theo-chan-nghe-si":  "https://www.facebook.com/profile.php?id=61583808625918",
  "fb-bung-no-showbiz":    "https://www.facebook.com/profile.php?id=61591037061142",
  "fb-showbiz-khong-giau": "https://www.facebook.com/showbizkhonggiau/",
  "fb-ngac-nhien-chua":    "https://www.facebook.com/profile.php?id=61590822120279",
  "fb-sau-bit-co-zi":      "https://www.facebook.com/profile.php?id=61590545426054",
  "ig-lets-have-fun":      "https://www.instagram.com/lets.havefunsaubit/",
  "ig-1000-nghiep":        "https://www.instagram.com/1000nghiep/",
};

for (const [id, pageUrl] of Object.entries(PAGE_URLS)) {
  const ref = col.doc(id);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`⏭  not found: ${id}`); continue; }
  await ref.update({ pageUrl });
  console.log(`✅ ${id} → ${pageUrl}`);
}
console.log("\nDone.");
process.exit(0);
