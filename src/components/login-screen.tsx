"use client";

import { useActionState, useState } from "react";
import { login, register, type FormState } from "@/app/actions/auth";
import { Symbol } from "@/components/hig/symbol";
import { Button, Field, ListSection, SegmentedControl, SportIcon } from "@/components/hig/ui";

export function LoginScreen({ initial }: { initial: "in" | "up" }) {
  const [mode, setMode] = useState<"in" | "up">(initial);
  const [v, setV] = useState({ name: "", email: "", pw: "" });
  const [inState, inAction, inPending] = useActionState<FormState, FormData>(login, undefined);
  const [upState, upAction, upPending] = useActionState<FormState, FormData>(register, undefined);
  const state = mode === "in" ? inState : upState;
  const pending = inPending || upPending;
  const set = (k: keyof typeof v) => (x: string) => setV((cur) => ({ ...cur, [k]: x }));

  return (
    <main className="auth">
      <div className="auth-hero" aria-hidden="true">
        <div className="auth-lanes">
          {Array.from({ length: 16 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <div className="auth-brand">
          <span className="auth-icon">
            <Symbol name="person.2" size={42} weight="semibold" />
          </span>
          <h1>Tandem</h1>
          <p>Training for two</p>
          <div className="auth-sports">
            <SportIcon sport="swim" tag />
            <SportIcon sport="bike" tag />
            <SportIcon sport="run" tag />
            <SportIcon sport="gym" tag />
          </div>
        </div>
      </div>

      <form className="auth-card hig-glass is-strong" action={mode === "in" ? inAction : upAction}>
        <SegmentedControl<"in" | "up">
          label="Log in or sign up"
          full
          value={mode}
          onChange={setMode}
          options={[
            { value: "in", label: "Log in" },
            { value: "up", label: "Sign up" },
          ]}
        />
        <ListSection>
          {mode === "up" && <Field id="f-name" name="name" label="Name" placeholder="Your name" value={v.name} onChange={set("name")} autoComplete="given-name" required />}
          <Field id="f-email" name="email" label="Email" type="email" inputMode="email" placeholder="you@example.com" value={v.email} onChange={set("email")} autoComplete="email" required />
          <Field id="f-pw" name="password" label="Password" type="password" placeholder={mode === "up" ? "8+ characters" : "Required"} value={v.pw} onChange={set("pw")} autoComplete={mode === "up" ? "new-password" : "current-password"} required />
        </ListSection>
        {state?.error && (
          <div className="err-row" style={{ borderRadius: "var(--radius-m)" }} role="alert">
            <Symbol name="exclamationmark.circle" size={18} weight="semibold" />
            {state.error}
          </div>
        )}
        <Button type="submit" variant="prominent" size="xl" full icon={mode === "in" ? "arrow.right" : "plus"} disabled={pending}>
          {pending ? "One moment…" : mode === "up" ? "Create account" : "Log in"}
        </Button>
        <div className="auth-foot">
          <Symbol name="lock" size={14} weight="semibold" />
          {mode === "up" ? "Only invited emails can sign up." : "Private: just the two of you."}
        </div>
      </form>

      <p className="auth-tail">Plans, weeks and progress for two athletes · season 2026–27</p>
    </main>
  );
}
