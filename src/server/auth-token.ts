import "server-only";

import { signSessionToken, verifySessionToken } from "@/lib/auth-token";
import type { SessionUser } from "@/lib/auth-token";
export { SESSION_COOKIE } from "@/lib/auth-token";

/**
 * In production AUTH_SECRET must be set. Locally we fall back to a fixed dev
 * secret so the app runs with no setup — it only ever signs local sessions.
 */
export function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret?.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required in production");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-meals-planner");
  }
  const bytes = new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === "production" && bytes.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes in production");
  }
  return bytes;
}

export async function signSession(user: SessionUser): Promise<string> {
  return signSessionToken(user, getSecret());
}

/** Proxy checks the signature only; private pages/actions also check the database. */
export async function verifySession(token: string): Promise<SessionUser | null> {
  return verifySessionToken(token, getSecret());
}

