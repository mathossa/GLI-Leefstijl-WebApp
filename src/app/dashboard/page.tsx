import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight, CircleCheck, Leaf, Sun, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-5 pb-3 sm:space-y-6">
      <section aria-labelledby="today-heading" className="wellness-pattern relative min-w-0 overflow-hidden rounded-[26px] border border-[#e2ebdf] px-5 py-7 sm:px-8 sm:py-9">
        <div className="relative z-10 max-w-[95%] space-y-2 sm:max-w-[75%]">
          <h1 id="today-heading" className="text-[1.65rem] font-bold leading-tight tracking-tight text-[#234735] sm:text-4xl">
            Goed dat je er bent <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-sm leading-relaxed text-[#526d5b]">Kleine stappen in je eigen tempo.</p>
          {goals.length === 0 && <Link href="/dashboard/doelen" className="inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-[#265f45] underline underline-offset-4">Maak je eerste doel <ArrowRight size={16} aria-hidden="true"/></Link>}
        </div>
        <div className="pointer-events-none absolute -bottom-12 -right-12 hidden size-48 items-center justify-center rounded-full bg-[#cfe4c9]/65 sm:flex sm:size-56" aria-hidden="true">
          <Leaf size={110} strokeWidth={1.2} className="-rotate-12 text-[#79a483]"/>
        </div>
      </section>

      <section aria-label="Overzicht van de week" className="grid min-w-0 grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="min-w-0 gap-2 rounded-[21px] p-3.5 sm:gap-3 sm:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f2e6] text-[#3c936b] sm:size-11"><Target size={20}/></span>
            <strong className="min-w-0 text-xl font-bold tabular-nums sm:text-2xl">{goals.length}</strong>
          </div>
          <p className="text-[11px] leading-tight text-[#53685a] sm:text-xs">Actieve doelen</p>
        </Card>
        <Card className="min-w-0 gap-2 rounded-[21px] p-3.5 sm:gap-3 sm:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff2d8] text-[#b67e2b] sm:size-11"><CircleCheck size={20}/></span>
            <strong className="min-w-0 whitespace-nowrap text-lg font-bold tabular-nums sm:text-2xl">{completed}<span className="text-[10px] text-[#657565] sm:text-xs">/{planned}</span></strong>
          </div>
          <p className="text-[11px] leading-tight text-[#53685a] sm:text-xs">Deze week</p>
        </Card>
        <Card className="min-w-0 gap-2 rounded-[21px] p-3.5 sm:gap-3 sm:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eae6f5] text-[#8e7cb3] sm:size-11"><TrendingUp size={20}/></span>
            <strong className="min-w-0 text-xl font-bold tabular-nums sm:text-2xl">{overall === null ? "–" : `${overall}%`}</strong>
          </div>
          <p className="text-[11px] leading-tight text-[#53685a] sm:text-xs">Voortgang</p>
        </Card>
      </section>

      <section aria-labelledby="habits-heading" className="min-w-0">
        <Card className="min-w-0 gap-4 rounded-[26px] p-3.5 sm:p-6">
          <div className="flex min-w-0 items-center justify-between gap-3 px-0.5">
            <h2 id="habits-heading" className="min-w-0 text-xl font-bold tracking-tight text-[#203d2e]">Vandaag afvinken</h2>
            <Link href="/dashboard/doelen" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#316847] hover:underline sm:text-sm">
              Alle acties <ChevronRight size={16} aria-hidden="true"/>
            </Link>
          </div>

          {weekActions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#b9cbb7] bg-[#f6faf3] p-5">
              <p className="text-sm text-[#3f5d46]">Nog geen weekacties.</p>
              <Link href="/dashboard/doelen" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#316447] underline">Weekactie toevoegen <ArrowRight size={15} aria-hidden="true"/></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {weekActions.map((habit) => (
                <article key={habit.id} className="min-w-0 space-y-3.5 rounded-[22px] border border-[#e6ece4] bg-white p-3.5 shadow-[0_8px_24px_-23px_rgba(31,69,43,.45)] sm:p-5">
                  <ActionReviewSheet actionTitle={habit.title} goalTitle={habit.detail} entries={habit.entries}/>
                  <QuickCompletion actionId={habit.id} title={habit.title}
                    completed={habit.done} target={habit.target} canUndo={habit.canUndo}/>
                </article>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Link href="/dashboard/reflectie" className="flex min-h-20 min-w-0 items-center gap-3 rounded-[23px] border border-[#e0e9dc] bg-[#f0f5ed] px-5 py-4 text-[#254b37] transition-colors hover:bg-[#e8f0e5]">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e1ebdf] text-[#528564]"><Sun size={22}/></span>
        <span className="min-w-0 flex-1 text-base font-bold">Even stilstaan</span>
        <ChevronRight size={20} className="shrink-0" aria-hidden="true"/>
      </Link>
    </div>
  );
}
