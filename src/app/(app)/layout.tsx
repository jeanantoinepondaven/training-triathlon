import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/tandem/icon";
import { OfflineNotice, TabBar } from "@/components/tandem/interactive";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh" style={{ paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}>
      <header className="mx-auto flex max-w-[680px] items-center justify-between px-5 pb-1" style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <Link href="/" className="flex items-center gap-2 text-ink no-underline" aria-label="Tandem, this week">
          <Logo size={28} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.03em" }}>tandem</span>
        </Link>
        <form action={logout} className="flex items-center gap-1">
          <span className="t-small text-ink-muted">{user.name}</span>
          <button className="td-btn td-btn-ghost td-btn-sm">Log out</button>
        </form>
      </header>
      <main className="mx-auto flex max-w-[680px] flex-col gap-6 px-5 pt-3 max-[380px]:px-4">
        <OfflineNotice />
        {children}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-[680px]">
          <TabBar />
        </div>
      </div>
    </div>
  );
}
