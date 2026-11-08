export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-white">T</div>
        <h1 className="text-2xl font-semibold">Training</h1>
        <p className="text-sm text-muted">Plans, cycles &amp; progress — for the two of us.</p>
      </div>
      {children}
    </main>
  );
}
