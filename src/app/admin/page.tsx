import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminSmtpForm } from "@/components/admin-smtp-form";
import { AdminUsers } from "@/components/admin-users";

export const metadata: Metadata = { title: "Beheer" };

export default async function AdminPage() {
  const session = await requireAdmin();
  const [config, logs] = await Promise.all([
    prisma.adminMailSettings.findUnique({ where: { id: "smtp" } }),
    prisma.adminAudit.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  // Explicit safe allowlist: encryptedPassword never crosses the server boundary.
  const settings = config ? {
    enabled: config.enabled, host: config.host, port: config.port, security: config.security,
    username: config.username ?? "", hasPassword: !!config.encryptedPassword,
    fromName: config.fromName, fromEmail: config.fromEmail,
    lastTestAt: config.lastTestAt?.toISOString() ?? null,
  } : null;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-6 sm:py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft size={16}/> Terug naar dashboard</Link>
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#126B68]">Afgeschermd beheer</p>
        <h1 className="text-3xl font-bold tracking-tight">Beheer</h1>
        <p className="text-sm text-muted-foreground">Ingelogd als {session.user.name}. Alleen beheerders kunnen hier instellingen wijzigen.</p>
      </header>
      <Card className="space-y-5"><AdminUsers currentUserId={session.user.id} /></Card>
      <Card className="space-y-5"><AdminSmtpForm settings={settings} /></Card>
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Instellingenlog</h2>
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">Nog geen beheeracties vastgelegd.</p> :
          <ul className="space-y-2 text-sm">{logs.map(row => <li key={row.id} className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0">
            <span>{row.action === "smtp.settings.saved" ? "SMTP-instellingen gewijzigd" : row.action === "smtp.test.sent" ? "Testmail verzonden" : row.action === "smtp.test.failed" ? "Testmail mislukt" : row.action === "admin.user.deleted" ? "Gebruiker verwijderd" : "SMTP-test aangevraagd"}</span>
            <time className="text-xs text-muted-foreground" dateTime={row.createdAt.toISOString()}>{row.createdAt.toLocaleString("nl-NL",{timeZone:"Europe/Amsterdam"})}</time>
          </li>)}</ul>}
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={14}/> Het log bevat alleen actie, actor-ID en tijdstip; nooit wachtwoorden.</p>
      </Card>
    </main>
  );
}
