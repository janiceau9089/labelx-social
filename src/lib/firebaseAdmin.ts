// Firebase Admin SDK (server side). Used by API routes for Firestore + token
// verification. Initialised once per server instance.
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let app: App;
if (getApps().length) {
  app = getApps()[0];
} else {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel stores the key with literal \n — convert back to real newlines.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
