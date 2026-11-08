"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: (s: FormState, f: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="card space-y-4 p-5">
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" className="input" autoComplete="given-name" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "register" ? 8 : undefined}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>First time? <Link className="text-accent" href="/register">Create an account</Link></>
        ) : (
          <>Already have one? <Link className="text-accent" href="/login">Log in</Link></>
        )}
      </p>
    </form>
  );
}
