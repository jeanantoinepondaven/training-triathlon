"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { TextField } from "@/components/tandem/interactive";
import { Notice } from "@/components/tandem/ui";

export function AuthForm({ mode, action }: { mode: "login" | "register"; action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "register" && <TextField label="Name" name="name" autoComplete="given-name" required />}
      <TextField label="Email" name="email" type="email" autoComplete="email" required />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        minLength={mode === "register" ? 8 : undefined}
        hint={mode === "register" ? "At least 8 characters." : undefined}
        required
      />
      {state?.error && <Notice tone="error" title={state.error} />}
      <button className="td-btn td-btn-primary td-btn-block" disabled={pending}>
        {pending ? "…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="t-small m-0 text-center text-ink-muted">
        {mode === "login" ? (
          <>First time? <Link href="/register" style={{ color: "var(--ink)", fontWeight: 600 }}>Create an account</Link></>
        ) : (
          <>Already have one? <Link href="/login" style={{ color: "var(--ink)", fontWeight: 600 }}>Log in</Link></>
        )}
      </p>
    </form>
  );
}
