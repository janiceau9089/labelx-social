// Server-side auth helpers. Verifies the Firebase ID token sent by the client
// and enforces the email allow-list.
// Supports exact emails and domain wildcards e.g. *@vanguardx.global
import { adminAuth } from "./firebaseAdmin";
import { AUTH_DISABLED } from "./config";

function list(env?: string): string[] {
  return (env || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function matchesList(email: string, entries: string[]): boolean {
  const e = email.toLowerCase();
  return entries.some((entry) => {
    if (entry.startsWith("*@")) {
      // domain wildcard: *@vanguardx.global
      return e.endsWith(entry.slice(1));
    }
    return e === entry;
  });
}

export function isAllowed(email?: string | null): boolean {
  if (!email) return false;
  return matchesList(email, list(process.env.ALLOWED_EMAILS));
}

export function isAdmin(email?: string | null): boolean {
  if (AUTH_DISABLED) return true;
  if (!email) return false;
  return matchesList(email, list(process.env.ADMIN_EMAILS));
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
