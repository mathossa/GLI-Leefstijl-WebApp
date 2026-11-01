import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { AdminQuotesManager } from "@/components/admin-quotes-manager";

export const metadata: Metadata = { title: "Motivatiequotes beheren" };

export default async function AdminQuotesPage() {
  await requireAdmin();
  const [quotes, active, inactive, removed] = await Promise.all([
    prisma.motivationQuote.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: { id: true, text: true, category: true, isActive: true, origin: true, deletedAt: true, updatedAt: true },
    }),
    prisma.motivationQuote.count({ where: { isActive: true, deletedAt: null } }),
    prisma.motivationQuote.count({ where: { isActive: false, deletedAt: null } }),
    prisma.motivationQuote.count({ where: { deletedAt: { not: null } } }),
  ]);
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-7 sm:px-6 sm:py-10">
      <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#255F50] hover:underline">
        <ArrowLeft size={18} aria-hidden="true"/> Terug naar beheer
      </Link>
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#255F50]">Afgeschermd beheer</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#233D34]">Motivatiequotes</h1>
        <p className="max-w-prose text-sm leading-relaxed text-[#536B60]">
          Beheer de gedeelde bibliotheek voor de dagelijkse quotes. Persoonlijke teksten van gebruikers blijven privé.
          Wijzigingen in de bibliotheek gelden vanaf de volgende kalenderdag.
        </p>
      </header>
      <AdminQuotesManager
        initialQuotes={quotes.map(quote => ({ ...quote, deleted: quote.deletedAt !== null, updatedAt: quote.updatedAt.toISOString(), deletedAt: undefined }))}
        counts={{ active, inactive, deleted: removed }}
      />
    </main>
  );
}
