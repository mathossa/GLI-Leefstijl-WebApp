import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const isAdmin = session.user.role?.split(",").includes("admin") ?? false;

  return <AppShell userName={session.user.name} isAdmin={isAdmin}>{children}</AppShell>;
}
