"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, schema } from "@/db";
import { endSession, startSession } from "@/server/auth";
import { field } from "@/lib/form";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = field(formData, "next") || "/";

  if (!email || !password) return { error: "Enter your email and password." };

  const db = await getDb();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  // Same message either way, so the form can't be used to discover addresses.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "That email and password don't match." };
  }

  await startSession({ id: user.id, name: user.name, email: user.email });
  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
