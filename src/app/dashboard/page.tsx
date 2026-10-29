import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, CircleCheck, Leaf, Sun, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { amsterdamMonday } from "@/lib/goals-domain.mjs";
import { QuickCompletion } from "@/components/quick-completion";
import { ActionReviewSheet } from "@/components/action-review-sheet";

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
            entries: { orderBy: { createdAt: "desc" }, take: 8,
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
    <div className="space-y-5 sm:space-y-7">
      <section className="wellness-pattern relative overflow-hidden rounded-[26px] border border-[#e2ebdf] px-5 py-6 sm:px-8 sm:py-8" aria-labelledby="today-heading">
        <div className="relative z-10 max-w-[90%] space-y-2 sm:max-w-[72%]">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#466c53]">Mijn overzicht · Week van {weekLabel}</p>
          <h1 id="today-heading" className="text-[1.65rem] font-bold leading-tight tracking-tight text-[#234735] sm:text-4xl">
            Goed dat je er bent <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-sm leading-relaxed text-[#526d5b]">Kleine stappen in je eigen tempo.</p>
          {goals.length === 0 && <Link href="/dashboard/doelen" className="inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-[#265f45] underline underline-offset-4">Mijn eerste doel maken <ArrowRight size={16} aria-hidden="true"/></Link>}
        </div>
        <div className="pointer-events-none absolute -bottom-14 -right-12 hidden size-44 items-center justify-center rounded-full bg-[#cfe4c9]/65 sm:flex sm:size-56" aria-hidden="true">
          <Leaf size={110} strokeWidth={1.2} className="-rotate-12 text-[#79a483]"/>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2.5 sm:gap-4" aria-label="Overzicht van de week">
        <Card className="min-w-0 gap-2.5 rounded-[22px] p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f2e6] text-[#3c936b] sm:size-11" aria-hidden="true"><Target size={20}/></span>
            <strong className="text-xl font-bold tabular-nums sm:text-2xl">{goals.length}</strong>
          </div>
          <p className="text-[11px] leading-tight text-[#53685a] sm:text-xs">Actieve doelen</p>
        </Card>
        <Card className="min-w-0 gap-2.5 rounded-[22px] p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff2d8] text-[#b67e2b] sm:size-11" aria-hidden="true"><CircleCheck size={20}/></span>
            <strong className="whitespace-nowrap text-lg font-bold tabular-nums sm:text-2xl">{completed}<span className="text-xs text-[#657565]"> / {planned}</span></strong>
          </div>
          <p className="text-[11px] leading-tight text-[#53685a] sm:text-xs">Deze week</p>
        </Card>
        <Card className="min-w-0 gap-2.5 rounded-[22px] p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eae6f5] text-[#8e7cb3] sm:size-11" aria-hidden="true"><TrendingUp size={20}/></span>
            <strong className="text-xl font-bold tabular-nums sm:text-2xl">{overall === null ? "–" : `${overall}%`}</strong>
          </div>
          <p className="text-[11px] leading-tight text-[#53685a] sm:text-xs">Voortgang</p>
        </Card>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section aria-labelledby="habits-heading">
          <Card className="h-full gap-4 rounded-[26px] p-4 sm:p-6">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div><h2 id="habits-heading" className="text-xl font-bold tracking-tight text-[#203d2e]">Vandaag afvinken</h2><p className="mt-1 text-sm text-[#667b6b]">{weekActions.length === 0 ? "Nog geen weekacties vastgelegd" : "Tik op het vinkje, klaar."}</p></div>
              <Link href="/dashboard/doelen" className="flex shrink-0 items-center gap-1 pt-1 text-xs font-semibold text-[#316847] hover:underline sm:text-sm">Bekijk alles <ChevronRight size={16}/></Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {weekActions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#b9cbb7] bg-[#f6faf3] p-5">
                  <p className="text-sm text-[#3f5d46]">Je hebt nog geen weekacties. Maak een doel aan en voeg een haalbare eerste stap toe.</p>
                  <Link href="/dashboard/doelen" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#316447] underline">Naar mijn doelen <ArrowRight size={15} aria-hidden="true"/></Link>
                </div>
              )}
              {weekActions.slice(0, 6).map((habit) => (
                <article key={habit.id} className="space-y-3 rounded-[22px] border border-[#e5ebe1] bg-white p-3 shadow-[0_8px_26px_-23px_rgba(31,69,43,.45)] sm:p-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <ActionReviewSheet actionTitle={habit.title} goalTitle={habit.detail} entries={habit.entries}/>
                    <QuickCompletion actionId={habit.id} title={habit.title}
                      completed={habit.done} target={habit.target} canUndo={habit.canUndo}/>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={habit.done / habit.target * 100} className="h-1.5 flex-1" aria-label={`${habit.title}: ${habit.done} van ${habit.target} deze week`}/>
                    <span className="text-[11px] font-medium text-[#5a7663]">{habit.done}/{habit.target}</span>
                  </div>
                </article>
              ))}
              {weekActions.length > 6 && <p className="text-xs text-muted-foreground">En nog {weekActions.length - 6} acties bij Mijn doelen.</p>}
              {weekActions.length > 0 && <p className="pt-1 text-xs leading-relaxed text-[#637769]">Vink af met één tik. Tik op de actienaam als je wilt vertellen hoe het ging.</p>}
            </CardContent>
          </Card>
        </section>
        <section aria-labelledby="reflection-heading">
          <Card className="h-full justify-between gap-4 rounded-[26px] bg-[#f2f5ee] p-4 sm:p-6">
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
