// Helper for signed-URL-based channel logo access. We use signed URLs
// instead of public Storage objects because this Google Cloud organization
// enforces "Domain Restricted Sharing", which blocks granting allUsers
// access — the IAM principal public objects require, even under Uniform
// bucket-level access. Signed URLs sidestep that entirely: no IAM grant to
// allUsers is needed, they're scoped to one object, and they expire.
import { adminStorage } from "./firebaseAdmin";

export const LOGO_PREFIX = "channel-logos";
const SIGN_DAYS = 7; // V4 signing's hard cap is 7 days from a service account key

/** Generate a fresh signed URL (valid for SIGN_DAYS) for a stored logo path. */
export async function signLogoUrl(path: string): Promise<string> {
  const file = adminStorage.bucket().file(path);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + SIGN_DAYS * 24 * 60 * 60 * 1000,
  });
  return url;
}

/**
 * Given a list of channel-like objects with a `logoPath` field, returns the
 * same list with `logoUrl` populated with a freshly-signed URL. Channels
 * without a logoPath (or where signing fails, e.g. the file no longer
 * exists) are returned unchanged — callers already handle a missing
 * logoUrl by falling back to initials.
 */
export async function withFreshLogoUrls<T extends Record<string, unknown>>(channels: T[]): Promise<(T & { logoUrl?: string })[]> {
  return Promise.all(
    channels.map(async (ch) => {
      const logoPath = ch.logoPath as string | undefined;
      if (!logoPath) return ch;
      try {
        const logoUrl = await signLogoUrl(logoPath);
        return { ...ch, logoUrl };
      } catch {
        return ch; // file missing or signing failed — UI falls back to initials
      }
    })
  );
}
