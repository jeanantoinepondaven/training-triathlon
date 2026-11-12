"use client";
// Floating glass notices ("Moved to Fri 14 · Undo"), one at a time, plus the offline notice.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Notice } from "./ui";

type Toast = { message: string; icon?: string; tone?: "offline" | "done"; action?: string; onAction?: () => void; ms?: number };
const Ctx = createContext<{ show: (t: Toast) => void; toast: (Toast & { key: number }) | null; offline: string | null; clear: () => void }>({
  show: () => {},
  toast: null,
  offline: null,
  clear: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(Toast & { key: number }) | null>(null);
  const [offline, setOffline] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((t: Toast) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...t, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), t.ms ?? 4200);
  }, []);
  useEffect(() => {
    const upd = () => setOffline(navigator.onLine ? null : `Offline · last loaded ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
    };
  }, []);
  return <Ctx.Provider value={{ show, toast, offline, clear: () => setToast(null) }}>{children}</Ctx.Provider>;
}

export const useToast = () => useContext(Ctx).show;

/** Put this in a screen's floating area, above the tab bar or the set editor. */
export function ToastSlot() {
  const { toast, offline, clear } = useContext(Ctx);
  if (!toast && !offline) return null;
  return (
    <div className="toast-slot">
      {toast ? (
        <Notice
          key={toast.key}
          message={toast.message}
          icon={toast.icon}
          tone={toast.tone}
          action={toast.action}
          onAction={() => {
            clear();
            toast.onAction?.();
          }}
        />
      ) : (
        <Notice message={offline!} icon="wifi.slash" tone="offline" />
      )}
    </div>
  );
}
