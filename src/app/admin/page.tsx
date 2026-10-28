import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Settings2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Beheer" };

export default async function AdminPage() {
  const session = await requireAdmin();
  return (
    <main className="mx-auto max-w-4xl space-y-7 px-5 py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft size={16} /> Terug naar dashboard</Link>
      <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#78927d]">Afgeschermd beheer</p><h1 className="text-3xl font-bold tracking-tight">Beheerdersomgeving</h1><p className="text-sm text-muted-foreground">Ingelogd als {session.user.name}. Alleen gebruikers met de adminrol kunnen deze pagina zien.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><ShieldCheck size={25} className="text-primary" /><h2 className="font-semibold">Gebruikersbeheer</h2><p className="text-sm text-muted-foreground">Better Auth Admin-plugin is aangesloten. De gebruikersinterface volgt in issue #6.</p></Card>
        <Card><Settings2 size={25} className="text-primary" /><h2 className="font-semibold">SMTP en instellingen</h2><p className="text-sm text-muted-foreground">Verzending via eigen SMTP-relay en testmail volgen in issue #6.</p></Card>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={15}/> Alle autorisatiecontroles gebeuren aan serverzijde.</p>
    </main>
  );
}
