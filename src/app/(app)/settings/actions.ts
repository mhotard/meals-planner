"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, schema } from "@/db";
import { endSession, requireUser } from "@/server/auth";
import { memberName, normalizeEmail, passwordError } from "@/lib/auth-input";
import { replacePassword } from "@/db/auth";
import { redirect } from "next/navigation";

export type FormResult = { error?: string; ok?: string };

export async function changePassword(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const me = await requireUser();
  const current = formData.get("current");
  const next = formData.get("next");

  const invalid = passwordError(next);
  if (invalid || typeof next !== "string") return { error: invalid ?? "Enter a password." };
  if (typeof current !== "string" || new TextEncoder().encode(current).length > 72) return { error: "Current password is incorrect." };

  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, me.id))
    .limit(1);
  if (!row || row.sessionVersion !== me.sessionVersion || !(await bcrypt.compare(current, row.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  if (!(await replacePassword(db, me.id, me.sessionVersion, await bcrypt.hash(next, 12)))) {
    return { error: "Your session changed. Sign in again." };
  }
  await endSession();
  redirect("/login");
}

export async function addMember(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireUser();
  const name = memberName(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");

  if (!name || !email) return { error: "Enter a name (up to 100 characters) and valid email." };
  const invalid = passwordError(password);
  if (invalid || typeof password !== "string") return { error: invalid ?? "Enter a password." };

  const db = await getDb();
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing) return { error: "Someone already uses that email." };

  const created = await db.insert(schema.users).values({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
  }).onConflictDoNothing({ target: schema.users.email }).returning({ id: schema.users.id });
  if (!created.length) return { error: "Someone already uses that email." };

  revalidatePath("/settings");
  return { ok: `${name} can now sign in.` };
}
