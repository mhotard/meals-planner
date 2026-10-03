import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { findSessionUser } from "@/db/auth";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth-token";
import type { SessionUser } from "@/lib/auth-token";
export { SESSION_COOKIE } from "@/lib/auth-token";
export type { SessionUser } from "@/lib/auth-token";

export { getSecret, signSession, verifySession } from "./auth-token";
import { signSession, verifySession } from "./auth-token";

export async function startSession(user: SessionUser) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySession(token);
  return claims ? findSessionUser(await getDb(), claims) : null;
}

/** Use at the top of every authenticated page and server action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
