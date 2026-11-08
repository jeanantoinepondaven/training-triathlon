import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { BottomNav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh pb-20 md:pb-8">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-2">
          <span className="font-semibold">Training</span>
          <div className="hidden md:block">
            <BottomNav />
          </div>
          <form action={logout} className="flex items-center gap-2 text-sm text-muted">
            <span>{user.name}</span>
            <button className="rounded-lg px-2 py-1 hover:bg-surface-2" title="Log out">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
