import { requireUser } from "@/lib/auth";
import { ToastProvider } from "@/components/hig/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <ToastProvider>{children}</ToastProvider>;
}
