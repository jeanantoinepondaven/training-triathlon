import { Logo } from "@/components/tandem/icon";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={64} />
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, letterSpacing: "-0.03em" }}>tandem</span>
        <p className="m-0 text-ink-muted">Two athletes. One plan each.</p>
      </div>
      {children}
    </main>
  );
}
