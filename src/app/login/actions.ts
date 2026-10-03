"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { authenticatePassword } from "@/db/auth";
import { normalizeEmail, safeLoginDestination } from "@/lib/auth-input";
import { endSession, startSession } from "@/server/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");
  const next = safeLoginDestination(formData.get("next"));

  if (!email || typeof password !== "string" || !password || new TextEncoder().encode(password).length > 72) {
    return { error: "That email and password don't match." };
  }
  const user = await authenticatePassword(await getDb(), email, password);
  // Missing account, wrong password and throttled attempts have the same response.
  if (!user) return { error: "That email and password don't match." };

  await startSession(user);
  redirect(next);
}

export async function logout() {
  await endSession();
  redirect("/login");
}
