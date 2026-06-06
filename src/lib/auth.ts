// Server-side auth helpers. Verifies the Firebase ID token sent by the client
// and enforces the email allow-list.
import { adminAuth } from "./firebaseAdmin";
import { AUTH_DISABLED } from "./config";

function list(env?: string): string[] {
  return (env || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function isAllowed(email?: string | null): boolean {
  if (!email) return false;
  return list(process.env.ALLOWED_EMAILS).includes(email.toLowerCase());
}

export function isAdmin(email?: string | null): boolean {
  if (AUTH_DISABLED) return true;
  if (!email) return false;
  return list(process.env.ADMIN_EMAILS).includes(email.toLowerCase());
}

/** Verify the Bearer token on a request. Returns the user or throws. */
export async function requireUser(req: Request): Promise<{ uid: string; email: string }> {
  if (AUTH_DISABLED) return { uid: "demo", email: "demo@labelx.local" };
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const decoded = await adminAuth.verifyIdToken(token);
  if (!isAllowed(decoded.email)) throw new Response("Forbidden", { status: 403 });
  return { uid: decoded.uid, email: decoded.email as string };
}
