"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";

export type FormResult = { error?: string; ok?: string };

export async function changePassword(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  if (next.length < 8) return { error: "New password must be at least 8 characters." };

  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, me.id))
    .limit(1);
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  await db
    .update(schema.users)
    .set({ passwordHash: await bcrypt.hash(next, 12) })
    .where(eq(schema.users.id, me.id));

  return { ok: "Password updated." };
}

export async function addMember(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) return { error: "Name and email are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const db = await getDb();
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing) return { error: "Someone already uses that email." };

  await db.insert(schema.users).values({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
  });

  revalidatePath("/settings");
  return { ok: `${name} can now sign in.` };
}
