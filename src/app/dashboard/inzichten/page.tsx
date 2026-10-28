import type { Metadata } from "next";
import Link from "next/link";
import { Download, ChartNoAxesCombined, Heart, Sprout } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { amsterdamMonday } from "@/lib/goals-domain.mjs";
import { amsterdamDate, dateOnly, summarizeCompletion } from "@/lib/reflections-domain.mjs";

export const metadata: Metadata = { title: "Inzichten" };

type Completion = { completed: number; target: number; percentage: number | null };

function MetricRow({ label, value }: { label: string; value: Completion }) {
  return <li className="grid gap-2 rounded-xl border border-border bg-white p-3 sm:grid-cols-[minmax(110px,1fr)_minmax(150px,2fr)_minmax(125px,1fr)] sm:items-center">
    <span className="text-sm font-semibold">{label}</span>
    <div className="h-3 overflow-hidden rounded-full bg-[#e8efe7]" aria-hidden="true">
      {value.percentage !== null && <div className="h-full rounded-full bg-[#639376]" style={{ width: value.percentage + "%" }}/>}
    </div>
    <span className="text-sm text-[#365f46]">
      {value.percentage === null ? "Geen registratie" : value.completed + "/" + value.target + " · " + value.percentage + "%"}
    </span>
  </li>;
}

export default async function InsightsPage() {
  const { user } = await requireSession();
  const now = amsterdamDate();
  const monday = amsterdamMonday();
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    return d;
  });
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(Date.UTC(Number(now.slice(0, 4)), Number(now.slice(5, 7)) - 1 - i, 1)));
  const earliest = weeks[11] < months[5] ? weeks[11] : months[5];

  const [progress, reflectionCount] = await Promise.all([
    prisma.habitWeekProgress.findMany({
      where: { userId: user.id, weekStart: { gte: earliest, lte: monday } },
      select: { weekStart: true, completedCount: true, targetCount: true },
    }),
    prisma.weeklyReflection.count({ where: { userId: user.id, weekStart: { gte: weeks[11] } } }),
  ]);
  const weekly = weeks.map((date) => ({
    date, completion: summarizeCompletion(progress.filter((item) => dateOnly(item.weekStart) === dateOnly(date))),
  }));
  const monthly = months.map((date) => ({
    date, completion: summarizeCompletion(progress.filter(
      (item) => dateOnly(item.weekStart).slice(0, 7) === dateOnly(date).slice(0, 7))),
  }));
  const registeredWeeks = weekly.filter((entry) => entry.completion.percentage !== null).length;
  const formatWeek = new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", day: "numeric", month: "short" });
  const formatMonth = new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", month: "long", year: "numeric" });

  return <div className="space-y-7">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#466e51]">Jouw ontwikkeling</p>
      <h1 className="text-3xl font-bold tracking-tight">Inzichten <span aria-hidden="true">📈</span></h1>
      <p className="text-sm text-muted-foreground">Inzicht in wat je hebt geregistreerd, zonder oordelen of medische aannames.</p>
    </header>
    <div className="grid gap-4 sm:grid-cols-2">
      <Card><CardContent className="flex items-center gap-3"><Sprout size={26} className="text-[#3f805e]" aria-hidden="true"/>
        <div><p className="text-2xl font-bold">{registeredWeeks} van 12</p>
          <p className="text-sm text-muted-foreground">Weken met geregistreerde acties</p></div>
      </CardContent></Card>
      <Card><CardContent className="flex items-center gap-3"><Heart size={26} className="text-[#3f805e]" aria-hidden="true"/>
        <div><p className="text-2xl font-bold">{reflectionCount}</p>
          <p className="text-sm text-muted-foreground">Reflecties in de laatste 12 weken</p></div>
      </CardContent></Card>
    </div>
    <section aria-labelledby="weekly">
      <Card><CardContent className="space-y-4">
        <div className="flex items-center gap-3"><ChartNoAxesCombined className="text-[#3f805e]" aria-hidden="true"/>
          <h2 className="text-xl font-semibold" id="weekly">Wekelijkse voortgang</h2></div>
        <p className="text-sm text-muted-foreground">Laatste twaalf weken. Aantal uitgevoerde weekacties ten opzichte van geregistreerde weekdoelen.</p>
        {registeredWeeks === 0 && <p className="text-sm text-muted-foreground">Er zijn nog geen registraties. <Link href="/dashboard/doelen" className="underline">Begin bij je doelen.</Link></p>}
        <ul className="space-y-2" aria-label="Wekelijkse voortgang">
          {weekly.map(({ date, completion }) =>
            <MetricRow key={dateOnly(date)} label={"Week " + formatWeek.format(date)} value={completion}/>)}
        </ul>
      </CardContent></Card>
    </section>
    <section aria-labelledby="monthly">
      <Card><CardContent className="space-y-4">
        <h2 className="text-xl font-semibold" id="monthly">Maandelijkse voortgang</h2>
        <p className="text-sm text-muted-foreground">Zes kalendermaanden. Een week telt mee bij de maand waarin de maandag valt.</p>
        <ul className="space-y-2" aria-label="Maandelijkse voortgang">
          {monthly.map(({ date, completion }) =>
            <MetricRow key={dateOnly(date)} label={formatMonth.format(date)} value={completion}/>)}
        </ul>
      </CardContent></Card>
    </section>
    <section aria-labelledby="export" className="space-y-3 rounded-2xl border border-[#d9e5d7] bg-[#f2f6ef] p-5">
      <h2 id="export" className="font-semibold">Jouw gegevens downloaden</h2>
      <p className="text-sm text-muted-foreground">Exporteer alle eigen doelen, weekregistraties, reflecties en bijeenkomstnotities als JSON. Het bestand bevat persoonlijke informatie; bewaar het veilig.</p>
      <a href="/api/export" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2e6d50] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245940] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e6d50]">
        <Download size={17} aria-hidden="true"/> Download JSON-export
      </a>
    </section>
    <p className="text-sm text-muted-foreground">Een lege week betekent ‘geen registratie’, niet 0% inzet. De gegevens beschrijven alleen je eigen invoer; het is geen gezondheidsadvies.</p>
  </div>;
}
