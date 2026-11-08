"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createSession, destroySession, sessionSecretConfigured } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const MISCONFIGURED: FormState = {
  error: "Server setup incomplete: SESSION_SECRET is missing. Add it in Vercel → Settings → Environment Variables (Production), then redeploy.",
};

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!sessionSecretConfigured()) return MISCONFIGURED;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
    return { error: "Wrong email or password." };
  }
  await createSession(u.id);
  redirect("/");
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !email.includes("@")) return { error: "Enter your name and a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!sessionSecretConfigured()) return MISCONFIGURED;

  // Private app: only the listed emails (or the first MAX_USERS people) can sign up.
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length && !allowed.includes(email)) return { error: "This email isn't invited to this app." };

  const db = await getDb();
  // With an allowlist, the list itself is the gate; otherwise cap the number of accounts.
  if (!allowed.length) {
    const [{ n }] = await db.select({ n: count() }).from(schema.users);
    const max = Number(process.env.MAX_USERS ?? 2);
    if (n >= max) return { error: "This app is full. Set ALLOWED_EMAILS (or raise MAX_USERS) in Vercel." };
  }

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) return { error: "An account with this email already exists. Log in instead." };

  const [u] = await db
    .insert(schema.users)
    .values({ name, email, passwordHash: await bcrypt.hash(password, 10) })
    .returning({ id: schema.users.id });
  await createSession(u.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
