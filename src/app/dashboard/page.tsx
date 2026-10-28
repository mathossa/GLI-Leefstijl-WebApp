import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronRight, CircleCheck, Leaf, Sparkles, Sun, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { amsterdamMonday } from "@/lib/goals-domain.mjs";
import { QuickCompletion } from "@/components/quick-completion";
import { ActionEntryFeedback } from "@/components/action-entry-feedback";

export const metadata: Metadata = { title: "Vandaag" };
export default async function DashboardPage() {
  const { user } = await requireSession();
  const weekStart = amsterdamMonday();
  // The user's own active goals and weekly snapshots, never shared demo data.
  const goals = await prisma.goal.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      title: true,
      actions: {
        where: { userId: user.id, archivedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, targetPerWeek: true,
          weeks: { where: { userId: user.id, weekStart }, take: 1, select: {
            targetCount: true, completedCount: true,
            entries: { orderBy: { createdAt: "desc" }, take: 4,
              select: { id: true, createdAt: true, rating: true, note: true } },
          } },
        },
      },
    },
  });
  const weekActions = goals.flatMap((goal) => goal.actions.map((action) => ({
    id: action.id, title: action.title, detail: goal.title,
    done: action.weeks[0]?.completedCount ?? 0,
    target: action.weeks[0]?.targetCount ?? action.targetPerWeek,
    canUndo: (action.weeks[0]?.entries.length ?? 0) > 0,
    entries: action.weeks[0]?.entries.map((entry) => ({
      ...entry, createdAt: entry.createdAt.toISOString(),
    })) ?? [],
  })));
  const completed = weekActions.reduce((sum, action) => sum + action.done, 0);
  const planned = weekActions.reduce((sum, action) => sum + action.target, 0);
  const overall = planned > 0 ? Math.round(completed / planned * 100) : null;
  const weekLabel = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "UTC", day: "numeric", month: "long",
  }).format(weekStart);
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.18em] text-[#506d59]">Mijn overzicht</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Goed dat je er bent <span aria-hidden="true">☀️</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">Een plek voor jouw eigen doelen en weekacties, in je eigen tempo.</p>
        </div>
        <Badge variant="outline" className="gap-2 bg-white/80 py-2"><CalendarDays size={14} aria-hidden="true"/> Week van {weekLabel}</Badge>
      </div>

      <section className="wellness-pattern relative overflow-hidden rounded-[28px] border border-[#e5ecdc] px-6 py-7 sm:px-9 sm:py-9" aria-labelledby="welcome-title">
        <div className="relative z-10 max-w-full space-y-3 sm:max-w-[72%]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#557e60]"><Sparkles size={15}/> Jouw groei telt</span>
          <h2 id="welcome-title" className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Ruimte voor jouw <span className="text-[#367451]">kleine stappen</span></h2>
          <p className="max-w-sm text-sm leading-relaxed text-[#496b51]">Niet perfect, wel vooruit. Focus op wat vandaag mogelijk is.</p>
          <Button asChild size="sm" className="mt-2"><Link href="/dashboard/doelen">{goals.length === 0 ? "Mijn eerste doel maken" : "Mijn doelen beheren"} <ArrowRight size={16}/></Link></Button>
        </div>
        <div className="pointer-events-none absolute -bottom-6 -right-7 hidden size-44 sm:flex items-center justify-center rounded-full bg-[#cfe6ce]/70 sm:-bottom-8 sm:right-12 sm:size-56">
          <div className="flex size-32 rotate-[-15deg] items-center justify-center rounded-full bg-[#e4eee0] sm:size-40"><Leaf size={94} strokeWidth={1} className="text-[#679b76] sm:size-28" /></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Overzicht van de week">
        <Card className="flex-row items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#e7f3e6] text-[#4e9671]"><Target size={22}/></span>
          <div><p className="text-2xl font-bold">{goals.length}</p><p className="text-xs text-muted-foreground">Actieve doelen</p></div>
        </Card>
        <Card className="flex-row items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff3d8] text-[#c99b4e]"><CircleCheck size={22}/></span>
          <div><p className="text-2xl font-bold">{completed} <span className="text-sm text-[#536c57]">/ {planned}</span></p><p className="text-xs text-muted-foreground">Stappen deze week</p></div>
        </Card>
        <Card className="flex-row items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8e5f5] text-[#8d81b3]"><TrendingUp size={22}/></span>
          <div><p className="text-2xl font-bold">{overall === null ? '–' : `${overall}%`}</p><p className="text-xs text-muted-foreground">Van je weekacties</p></div>
        </Card>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section aria-labelledby="habits-heading">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle id="habits-heading" className="text-xl">Vandaag afvinken</CardTitle><p className="mt-1 text-sm text-muted-foreground">{weekActions.length === 0 ? "Nog geen weekacties vastgelegd" : "Dit wil je deze week oefenen"}</p></div>
              <Link href="/dashboard/doelen" className="flex items-center gap-1 text-sm font-semibold text-[#3f805e] hover:underline">Bekijk alles <ChevronRight size={16}/></Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {weekActions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#b9cbb7] bg-[#f6faf3] p-5">
                  <p className="text-sm text-[#3f5d46]">Je hebt nog geen weekacties. Maak een doel aan en voeg een haalbare eerste stap toe.</p>
                  <Link href="/dashboard/doelen" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#316447] underline">Naar mijn doelen <ArrowRight size={15} aria-hidden="true"/></Link>
                </div>
              )}
              {weekActions.slice(0, 6).map((habit) => (
                <div key={habit.id} className="space-y-3 rounded-2xl border border-[#e9ede4] bg-[#fffefb] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2e6] text-xl text-[#426e50]" aria-hidden="true"><Check size={22}/></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{habit.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{habit.detail}</p>
                    <Progress value={habit.done / habit.target * 100} className="mt-2 h-1.5" aria-label={`${habit.title}: ${habit.done} van ${habit.target} uitgevoerd`}/>
                  </div>
                  <QuickCompletion actionId={habit.id} title={habit.title} completed={habit.done} target={habit.target} canUndo={habit.canUndo}/>
                  </div>
                  <ActionEntryFeedback entries={habit.entries} label="Hoe ging het per keer?"/>
                </div>
              ))}
              {weekActions.length > 6 && <p className="text-xs text-muted-foreground">En nog {weekActions.length - 6} acties bij Mijn doelen.</p>}
              {weekActions.length > 0 && <p className="pt-1 text-xs text-muted-foreground">Tik op 'Gedaan' zodra je een actie hebt uitgevoerd. Een ervaring toevoegen is altijd optioneel.</p>}
            </CardContent>
          </Card>
        </section>
        <section aria-labelledby="reflection-heading">
          <Card className="h-full justify-between bg-[#f2f5ee]">
            <CardHeader>
              <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-[#e0ebde] text-[#528564]"><Sun size={21}/></span>
              <CardTitle id="reflection-heading" className="text-xl">Even stilstaan</CardTitle>
              <p className="text-sm leading-relaxed text-[#70806e]">Een moment voor jezelf. Hoe voel je je en waar ben je trots op?</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-white/75 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#576b59]">Voorbeeldreflectievraag</p>
                <p className="mt-2 font-medium leading-relaxed">Wat ging deze week beter dan je vooraf dacht?</p>
              </div>
              <Button variant="outline" asChild className="w-full bg-white"><Link href="/dashboard/reflectie">Bekijk reflectie <ArrowRight size={16}/></Link></Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-[#ecf2e9] px-5 py-4 text-sm text-[#567362]"><Check size={17} className="shrink-0" aria-hidden="true"/><span>Je hoeft niet alles in één keer te veranderen. Eén haalbare stap is genoeg om te beginnen.</span></div>
      <footer className="flex items-center justify-center gap-2 pb-3 text-xs text-[#506b56]"><Leaf size={14}/> Mijn Leefstijl · AGPL-3.0 · <a className="underline" href="https://github.com/mathossa/GLI-Leefstijl-WebApp" rel="noopener noreferrer" target="_blank">Broncode</a></footer>
    </div>
  );
}
