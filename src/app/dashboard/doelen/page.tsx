import type { Metadata } from "next";
import { Archive, CalendarDays, Leaf, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { amsterdamMonday, GOAL_AREAS, MAX_ACTIVE_ACTIONS, MAX_ACTIVE_GOALS } from "@/lib/goals-domain.mjs";
import { ActionEntryFeedback } from "@/components/action-entry-feedback";
import {
  archiveGoal, archiveHabitAction, createGoal, createHabitAction,
  saveWeekReflection, updateGoal, updateHabitAction,
} from "./actions";

export const metadata: Metadata = { title: "Mijn doelen" };

const inputClass = "mt-1 block w-full rounded-xl border border-[#b8c9b6] bg-white px-3 py-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d7657]";
const labelClass = "block text-sm font-medium text-[#31533e]";
const muted = "text-sm leading-relaxed text-muted-foreground";
const areaLabel = (key: string) => GOAL_AREAS.find((area) => area.value === key)?.label ?? "Anders";
const isoDate = (value: Date | null) => value ? value.toISOString().slice(0, 10) : "";
const displayDate = (value: Date) => new Intl.DateTimeFormat("nl-NL", {
  timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
}).format(value);

function GoalFields({ goal }: { goal?: {
  id: string; title: string; motivation: string; area: string; startDate: Date | null; endDate: Date | null;
} }) {
  return (
    <>
      <div>
        <label className={labelClass} htmlFor={goal ? "goal-title-" + goal.id : "new-goal-title"}>Wat wil je bereiken?</label>
        <input className={inputClass} id={goal ? "goal-title-" + goal.id : "new-goal-title"} name="title"
          maxLength={120} required defaultValue={goal?.title} placeholder="Bijv. met meer energie de dag beginnen" />
      </div>
      <div>
        <label className={labelClass} htmlFor={goal ? "goal-motivation-" + goal.id : "new-goal-motivation"}>Waarom is dit belangrijk voor je?</label>
        <textarea className={inputClass} id={goal ? "goal-motivation-" + goal.id : "new-goal-motivation"}
          name="motivation" maxLength={1000} rows={3} required defaultValue={goal?.motivation}
          placeholder="Wat hoop je hiermee voor jezelf te veranderen?" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor={goal ? "goal-area-" + goal.id : "new-goal-area"}>Leefstijlgebied</label>
          <select className={inputClass} id={goal ? "goal-area-" + goal.id : "new-goal-area"} name="area" defaultValue={goal?.area ?? "BEWEGING"}>
            {GOAL_AREAS.map((area) => <option key={area.value} value={area.value}>{area.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor={goal ? "goal-start-" + goal.id : "new-goal-start"}>Startdatum (optioneel)</label>
          <input className={inputClass} id={goal ? "goal-start-" + goal.id : "new-goal-start"}
            type="date" name="startDate" defaultValue={isoDate(goal?.startDate ?? null)} />
        </div>
        <div>
          <label className={labelClass} htmlFor={goal ? "goal-end-" + goal.id : "new-goal-end"}>Einddatum (optioneel)</label>
          <input className={inputClass} id={goal ? "goal-end-" + goal.id : "new-goal-end"}
            type="date" name="endDate" defaultValue={isoDate(goal?.endDate ?? null)} />
        </div>
      </div>
    </>
  );
}

export default async function GoalsPage({
  searchParams,
}: { searchParams: Promise<{ melding?: string }> }) {
  const session = await requireSession();
  const userId = session.user.id;
  const weekStart = amsterdamMonday();
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      actions: {
        where: { userId },
        orderBy: [{ archivedAt: "asc" }, { createdAt: "desc" }],
        include: {
          weeks: {
            where: { userId },
            orderBy: { weekStart: "desc" },
            take: 8,
            include: { entries: { orderBy: { createdAt: "desc" }, take: 8 } },
          },
        },
      },
    },
  });
  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE");
  const archivedGoals = goals.filter((goal) => goal.status === "ARCHIVED");
  const message = (await searchParams).melding;

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#466e51]">Jouw richting</p>
        <h1 className="text-3xl font-bold tracking-tight">Mijn doelen <span aria-hidden="true">🌱</span></h1>
        <p className={muted}>Hier vind je je doelen en hoe het gaat. Nieuwe doelen en wijzigingen zitten achter een uitklapbaar onderdeel.</p>
      </header>

      {message === "opgeslagen" && <p role="status" className="rounded-2xl bg-[#e6f1e5] p-4 text-sm text-[#28573e]">Je wijzigingen zijn opgeslagen.</p>}
      {message === "ongeldig" && <p role="alert" className="rounded-2xl border border-[#beaa77] bg-[#fcf5e5] p-4 text-sm text-[#614d27]">Controleer je invoer, de ingestelde limieten en of het doel nog actief is.</p>}

      <details className="group rounded-[24px] border border-[#cedecb] bg-[#edf4e9] p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold text-[#25573a] [&::-webkit-details-marker]:hidden">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#d7e9d5]"><Leaf size={20} aria-hidden="true"/></span>
          <span className="flex-1">Nieuw doel toevoegen <span className="block text-xs font-normal text-[#506a55]">Alleen als je iets nieuws wilt beginnen</span></span>
          <span aria-hidden="true" className="text-xl group-open:rotate-45">+</span>
        </summary>
        <form action={createGoal} className="mt-5 space-y-4 border-t border-[#cedecb] pt-5">
          <GoalFields />
          <Button type="submit" disabled={activeGoals.length >= MAX_ACTIVE_GOALS}>Doel aanmaken</Button>
          {activeGoals.length >= MAX_ACTIVE_GOALS && <p className={muted}>Maximaal {MAX_ACTIVE_GOALS} actieve doelen; archiveer eerst een bestaand doel.</p>}
        </form>
      </details>

      <section aria-label="Actieve doelen" className="space-y-5">
        <div className="flex items-center gap-2"><Target className="text-primary" aria-hidden="true" /><h2 className="text-xl font-semibold">Jouw actieve doelen ({activeGoals.length})</h2></div>
        {activeGoals.length === 0 && <p className={muted}>Je hebt nog geen doelen. Kies gerust één kleine eerste stap.</p>}
        {activeGoals.map((goal) => {
          const activeActions = goal.actions.filter((action) => !action.archivedAt);
          const archivedActions = goal.actions.filter((action) => action.archivedAt);
          return (
            <Card key={goal.id}>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1"><h3 className="text-xl font-semibold">{goal.title}</h3><p className={muted}>{goal.motivation}</p><p className="mt-2 text-xs font-medium text-[#4a7254]">{activeActions.length} actieve weekactie(s)</p></div>
                  <Badge variant="secondary">{areaLabel(goal.area)}</Badge>
                </div>
                {(goal.startDate || goal.endDate) && <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={15} aria-hidden="true"/> {goal.startDate ? displayDate(goal.startDate) : "Geen startdatum"} – {goal.endDate ? displayDate(goal.endDate) : "Geen einddatum"}</p>}
                <details className="rounded-xl border border-border p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#315a40]">Doel bewerken</summary>
                  <form action={updateGoal} className="mt-4 space-y-4">
                    <input type="hidden" name="goalId" value={goal.id}/>
                    <GoalFields goal={goal} />
                    <Button type="submit" size="sm">Wijzigingen opslaan</Button>
                  </form>
                </details>

                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold">Jouw weekacties</h4><p className={muted}>Week van {displayDate(weekStart)}</p></div><a href="/dashboard" className="text-sm font-semibold text-[#315e46] underline underline-offset-2">Snel registreren op Vandaag</a></div>
                  {activeActions.length === 0 && <p className={muted}>Nog geen weekacties gekoppeld aan dit doel.</p>}
                  {activeActions.map((action) => {
                    const thisWeek = action.weeks.find((week) => week.weekStart.getTime() === weekStart.getTime());
                    const target = thisWeek?.targetCount ?? action.targetPerWeek;
                    const completed = thisWeek?.completedCount ?? 0;
                    return (
                      <article key={action.id} className="space-y-3 rounded-2xl bg-[#f1f5ee] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5 className="font-semibold">{action.title}</h5><span className="text-sm text-[#365f46]">{completed}/{target} deze week</span>
                        </div>
                        <Progress value={completed / target * 100} aria-label={action.title + ": " + completed + " van " + target + " keer deze week"}/>
                        <p className="text-xs text-[#4b6953]">Registreren kan met één tik op Vandaag. Notities zijn altijd optioneel.</p>
                        <ActionEntryFeedback
                          entries={(thisWeek?.entries ?? []).map((entry) => ({
                            id: entry.id, createdAt: entry.createdAt.toISOString(),
                            rating: entry.rating, note: entry.note,
                          }))}
                        />
                        <details className="rounded-xl border border-[#d9e4d5] bg-white p-3">
                          <summary className="cursor-pointer text-sm font-medium text-[#315a40]">Weekreflectie (optioneel)</summary>
                          <form action={saveWeekReflection} className="mt-3 space-y-3">
                            <input type="hidden" name="actionId" value={action.id}/>
                            <label className={labelClass} htmlFor={"week-note-" + action.id}>Hoe kijk je terug op deze week?</label>
                            <textarea id={"week-note-" + action.id} className={inputClass} name="note"
                              rows={3} maxLength={500} defaultValue={thisWeek?.note ?? ""}
                              placeholder="Wat werkte voor je? Wat zou je anders willen?"/>
                            <Button type="submit" size="sm">Weekreflectie bewaren</Button>
                          </form>
                        </details>
                        <details className="border-t border-[#d9e4d5] pt-3">
                          <summary className="cursor-pointer text-sm font-medium text-[#315a40]">Actie bewerken en weekhistorie</summary>
                          <div className="mt-3 space-y-4">
                            <form action={updateHabitAction} className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
                              <input type="hidden" name="actionId" value={action.id}/>
                              <div><label className={labelClass} htmlFor={"edit-action-" + action.id}>Actie</label><input id={"edit-action-" + action.id} className={inputClass} name="title" maxLength={120} required defaultValue={action.title}/></div>
                              <div><label className={labelClass} htmlFor={"edit-target-" + action.id}>Per week (1–7)</label><input id={"edit-target-" + action.id} className={inputClass} type="number" min={1} max={7} name="targetPerWeek" required defaultValue={action.targetPerWeek}/></div>
                              <Button type="submit" size="sm">Aanpassen</Button>
                            </form>
                            <p className="text-xs text-muted-foreground">Een nieuwe frequentie geldt vanaf volgende week. Historische aantallen en weekdoelen blijven bewaard.</p>
                            <div>
                              <h6 className="text-sm font-semibold">Recente weekhistorie</h6>
                              {action.weeks.length === 0 ? <p className={muted}>Er zijn nog geen weekregistraties.</p> :
                                <ul className="mt-2 space-y-2 text-sm">
                                  {action.weeks.map((week) => <li key={week.id} className="rounded-xl bg-white p-3">
                                    <span className="font-medium">{displayDate(week.weekStart)}: {week.completedCount} van {week.targetCount}</span>
                                    {week.note && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{week.note}</p>}
                                  </li>)}
                                </ul>
                              }
                            </div>
                            <form action={archiveHabitAction}>
                              <input type="hidden" name="actionId" value={action.id}/>
                              <Button type="submit" variant="outline" size="sm"><Archive size={15} aria-hidden="true"/> Actie archiveren</Button>
                            </form>
                          </div>
                        </details>
                      </article>
                    );
                  })}

                  {activeActions.length < MAX_ACTIVE_ACTIONS && (
                    <details className="rounded-xl border border-dashed border-[#b9cbb7] bg-[#f7faf5] p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-[#2f6749]">+ Weekactie toevoegen</summary>
                      <form action={createHabitAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
                      <input type="hidden" name="goalId" value={goal.id}/>
                      <div><label className={labelClass} htmlFor={"new-action-" + goal.id}>Nieuwe weekactie</label><input className={inputClass} id={"new-action-" + goal.id} name="title" maxLength={120} required placeholder="Bijv. een wandeling maken"/></div>
                      <div><label className={labelClass} htmlFor={"new-target-" + goal.id}>Keer per week</label><input className={inputClass} id={"new-target-" + goal.id} name="targetPerWeek" type="number" min={1} max={7} defaultValue={3} required/></div>
                      <Button type="submit" size="sm">Actie toevoegen</Button>
                      </form>
                    </details>
                  )}
                  {activeActions.length >= MAX_ACTIVE_ACTIONS && <p className="text-xs text-muted-foreground">Maximum van {MAX_ACTIVE_ACTIONS} actieve weekacties bereikt.</p>}
                  {archivedActions.length > 0 && <details><summary className="cursor-pointer text-sm text-muted-foreground">Gearchiveerde weekacties ({archivedActions.length})</summary>
                    <ul className="mt-2 space-y-2">{archivedActions.map((action) => <li key={action.id} className="rounded-xl bg-[#f6f6f0] p-3 text-sm">
                      <span className="font-medium">{action.title}</span>
                      {action.weeks.map((week) => <p key={week.id} className="mt-1 text-muted-foreground">{displayDate(week.weekStart)}: {week.completedCount}/{week.targetCount}{week.note ? " · " + week.note : ""}</p>)}
                    </li>)}</ul>
                  </details>}
                </div>
                <form action={archiveGoal} className="border-t border-border pt-4">
                  <input type="hidden" name="goalId" value={goal.id}/>
                  <Button type="submit" variant="outline" size="sm"><Archive size={15} aria-hidden="true"/> Doel archiveren</Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {archivedGoals.length > 0 && (
        <section aria-label="Gearchiveerde doelen">
          <details className="rounded-2xl border border-border bg-white p-5">
            <summary className="cursor-pointer font-semibold">Gearchiveerde doelen ({archivedGoals.length})</summary>
            <ul className="mt-4 space-y-4">
              {archivedGoals.map((goal) => <li key={goal.id} className="rounded-xl bg-[#f4f5ef] p-4">
                <h3 className="font-semibold">{goal.title}</h3><p className={muted}>{goal.motivation}</p>
                <p className="mt-2 text-xs text-muted-foreground">{goal.actions.length} bewaarde weekacties · {goal.actions.reduce((sum, action) => sum + action.weeks.length, 0)} recente weekregistraties</p>
              </li>)}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
