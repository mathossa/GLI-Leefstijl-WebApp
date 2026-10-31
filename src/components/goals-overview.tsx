"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Archive, ArrowLeft, CalendarDays, ChevronDown, ChevronRight, ClipboardList, Ellipsis, Frown, Footprints, Heart, History, Meh, Moon, Pencil, Plus, Smile, Target, Utensils, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntryView } from "@/components/action-entry-feedback";
import { EntryReviewForm } from "@/components/action-review-sheet";
import {
  archiveGoal, archiveHabitAction, createGoal, createHabitAction,
  saveWeekReflection, updateGoal, updateHabitAction,
} from "@/app/dashboard/doelen/actions";
import { GOAL_AREAS, MAX_ACTIVE_ACTIONS, MAX_ACTIVE_GOALS } from "@/lib/goals-domain.mjs";
import { isoWeekLabel } from "@/lib/week-labels.mjs";

type WeekView = {
  id: string;
  weekStart: string;
  targetCount: number;
  completedCount: number;
  note: string | null;
  entries: EntryView[];
};
export type HabitView = {
  id: string;
  title: string;
  targetPerWeek: number;
  archived: boolean;
  weeks: WeekView[];
};
export type GoalView = {
  id: string;
  title: string;
  motivation: string;
  area: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  actions: HabitView[];
};

type View =
  | { kind: "new-goal" }
  | { kind: "goal"; goalId: string }
  | { kind: "edit-goal"; goalId: string }
  | { kind: "new-action"; goalId: string }
  | { kind: "action"; goalId: string; actionId: string }
  | { kind: "edit-action"; goalId: string; actionId: string }
  | { kind: "week-note"; goalId: string; actionId: string }
  | { kind: "experiences"; goalId: string; actionId: string }
  | { kind: "edit-experience"; goalId: string; actionId: string; entryId: string };

const inputClass = "mt-1.5 block w-full min-w-0 rounded-xl border border-[#D8E2D7] bg-white px-3.5 py-3 text-base text-[#233D34] focus-visible:border-[#255F50]";
const labelClass = "block text-sm font-semibold text-[#233D34]";
const labelForArea = (key: string) => GOAL_AREAS.find((item) => item.value === key)?.label ?? "Anders";
const areaStyles = {
  BEWEGING: { icon: Footprints, idle: "bg-[#EAF0E9] text-[#233D34]", active: "border-[#D8E2D7] bg-[#EAF0E9] text-[#233D34]" },
  VOEDING: { icon: Utensils, idle: "bg-[#fff3df] text-[#a66619]", active: "border-[#efbf7d] bg-[#FCE8D8] text-[#885115]" },
  SLAAP: { icon: Moon, idle: "bg-[#EAF0E9] text-[#426cae]", active: "border-[#a3b9e7] bg-[#e1eafb] text-[#305a9a]" },
  ONTSPANNING: { icon: Heart, idle: "bg-[#EAF0E9] text-[#875cad]", active: "border-[#c8a8dd] bg-[#EAF0E9] text-[#754aa0]" },
  SOCIAAL: { icon: Users, idle: "bg-[#EAF0E9] text-[#af5e58]", active: "border-[#e9b2ad] bg-[#EAF0E9] text-[#91453e]" },
  ANDERS: { icon: Ellipsis, idle: "bg-[#EAF0E9] text-[#255F50]", active: "border-[#D8E2D7] bg-[#EAF0E9] text-[#233D34]" },
} as const;
const experienceStyle = {
  GOED: { icon: Smile, text: "Ging goed", color: "bg-[#EAF0E9] text-[#233D34]" },
  REDELIJK: { icon: Meh, text: "Redelijk", color: "bg-[#fff4df] text-[#ad7629]" },
  LASTIG: { icon: Frown, text: "Lastig", color: "bg-[#EAF0E9] text-[#b74443]" },
} as const;
const experienceTime = (date: string) => new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam", weekday: "short", day: "numeric",
  month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(date));
const shortDate = (iso: string) => new Intl.DateTimeFormat("nl-NL", {
  day: "numeric", month: "short", timeZone: "UTC",
}).format(new Date(iso + "T00:00:00Z"));
const weekLabel = isoWeekLabel;
const dates = (goal: GoalView) => {
  if (!goal.startDate && !goal.endDate) return null;
  return [goal.startDate ? shortDate(goal.startDate) : "–", goal.endDate ? shortDate(goal.endDate) : "–"].join(" – ");
};
const activeActions = (goal: GoalView) => goal.actions.filter((action) => !action.archived);
const currentProgress = (action: HabitView, currentWeek: string) => {
  const snap = action.weeks.find((week) => week.weekStart === currentWeek);
  return { completed: snap?.completedCount ?? 0, target: snap?.targetCount ?? action.targetPerWeek, week: snap };
};
const percent = (done: number, total: number) => total > 0 ? Math.round(done / total * 100) : 0;

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAF0E9]" aria-hidden="true">
      <div className="brand-progress h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%` }}/>
    </div>
  );
}

function GoalFields({ goal }: { goal?: GoalView }) {
  const prefix = goal?.id ?? "new";
  const [selectedArea, setSelectedArea] = useState(goal?.area ?? "BEWEGING");
  return (
    <>
      <div>
        <label htmlFor={`goal-title-${prefix}`} className={labelClass}>Titel van je doel</label>
        <input id={`goal-title-${prefix}`} name="title" maxLength={120} required
          className={inputClass} defaultValue={goal?.title ?? ""} placeholder="Bijvoorbeeld: meer bewegen"/>
      </div>
      <div>
        <label htmlFor={`goal-motivation-${prefix}`} className={labelClass}>Motivatie <span className="font-normal text-[#255F50]">(optioneel)</span></label>
        <textarea id={`goal-motivation-${prefix}`} name="motivation" maxLength={1000} rows={3}
          className={inputClass} defaultValue={goal?.motivation ?? ""} placeholder="Waarom is dit doel belangrijk voor je?"/>
      </div>
      <fieldset>
        <legend className={labelClass}>Leefstijlgebied</legend>
        <input type="hidden" name="area" value={selectedArea}/>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {GOAL_AREAS.map((area) => {
            const style = areaStyles[area.value as keyof typeof areaStyles];
            const Icon = style.icon;
            const chosen = selectedArea === area.value;
            return (
              <button key={area.value} type="button" onClick={() => setSelectedArea(area.value)}
                aria-pressed={chosen}
                className={`flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-xl border p-2 text-center text-xs font-semibold transition-colors sm:text-sm ${
                  chosen ? style.active + " ring-1 ring-current/20" : "border-transparent " + style.idle + " hover:brightness-95"
                }`}>
                <Icon className="size-5 shrink-0" aria-hidden="true"/>
                <span className="min-w-0 break-words">{area.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`goal-start-${prefix}`} className={labelClass}>Startdatum <span className="block text-xs font-normal">(optioneel)</span></label>
          <input id={`goal-start-${prefix}`} type="date" name="startDate" className={inputClass} defaultValue={goal?.startDate ?? ""}/>
        </div>
        <div>
          <label htmlFor={`goal-end-${prefix}`} className={labelClass}>Einddatum <span className="block text-xs font-normal">(optioneel)</span></label>
          <input id={`goal-end-${prefix}`} type="date" name="endDate" className={inputClass} defaultValue={goal?.endDate ?? ""}/>
        </div>
      </div>
    </>
  );
}

export function GoalsOverview({ goals, currentWeek, message }: {
  goals: GoalView[];
  currentWeek: string;
  message: string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const active = goals.filter((goal) => goal.status === "ACTIVE");
  const archived = goals.filter((goal) => goal.status !== "ACTIVE");

  function open(next: View) {
    setView(next);
    if (!dialog.current?.open) dialog.current?.showModal();
    else dialog.current.scrollTop = 0;
  }
  function close() {
    dialog.current?.close();
    setView(null);
  }
  function back() {
    if (!view || view.kind === "new-goal" || view.kind === "goal") { close(); return; }
    if (view.kind === "edit-goal" || view.kind === "new-action") {
      open({ kind: "goal", goalId: view.goalId });
      return;
    }
    if (view.kind === "action") { open({ kind: "goal", goalId: view.goalId }); return; }
    if (view.kind === "edit-experience") {
      open({ kind: "experiences", goalId: view.goalId, actionId: view.actionId });
      return;
    }
    open({ kind: "action", goalId: view.goalId, actionId: view.actionId });
  }

  const goal = view && "goalId" in view ? goals.find((item) => item.id === view.goalId) : null;
  const action = view && "actionId" in view ? goal?.actions.find((item) => item.id === view.actionId) : null;
  const progress = action ? currentProgress(action, currentWeek) : null;
  const entries = action?.weeks.flatMap((week) => week.entries)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) ?? [];
  const selectedEntry = view?.kind === "edit-experience" ?
    entries.find((entry) => entry.id === view.entryId) : null;
  const handleReviewSaved = useCallback(() => {
    setView((old) => old?.kind === "edit-experience"
      ? { kind: "experiences", goalId: old.goalId, actionId: old.actionId }
      : old);
    router.refresh();
  }, [router]);

  let title = "Nieuw doel toevoegen";
  if (view?.kind === "goal") title = goal?.title ?? "Doel";
  if (view?.kind === "edit-goal") title = "Doel bewerken";
  if (view?.kind === "new-action") title = "Weekactie toevoegen";
  if (view?.kind === "action") title = action?.title ?? "Weekactie";
  if (view?.kind === "edit-action") title = "Weekactie bewerken";
  if (view?.kind === "week-note") title = "Weekreflectie";
  if (view?.kind === "experiences") title = "Ervaringen";
  if (view?.kind === "edit-experience") title = "Hoe ging het?";
  const canBack = view && !["goal", "new-goal"].includes(view.kind);

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#233D34]">Mijn doelen</h1>
        <p className="text-sm text-[#255F50]">{isoWeekLabel(currentWeek)}</p>
      </header>

      {message === "opgeslagen" && <p role="status" className="rounded-2xl bg-[#EAF0E9] p-3 text-sm text-[#233D34]">Wijzigingen opgeslagen.</p>}
      {message === "ongeldig" && <p role="alert" className="rounded-2xl border border-[#e2c99b] bg-[#fff5e4] p-3 text-sm text-[#815d31]">Controleer je invoer en de ingestelde limieten.</p>}

      <button type="button" onClick={() => open({ kind: "new-goal" })} disabled={active.length >= MAX_ACTIVE_GOALS}
        className="flex min-h-18 w-full items-center gap-3 rounded-[22px] border border-[#D8E2D7] bg-[#EAF0E9] px-4 py-3 text-left text-sm font-semibold text-[#233D34] hover:bg-[#EAF0E9] disabled:opacity-50">
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#EAF0E9]"><Plus size={21}/></span>
        <span className="min-w-0 flex-1">Nieuw doel toevoegen</span>
        <ChevronRight size={19} aria-hidden="true"/>
      </button>

      <section className="space-y-3" aria-labelledby="active-goals-title">
        <h2 id="active-goals-title" className="flex items-center gap-2 text-lg font-bold text-[#233D34]">
          <Target size={21} aria-hidden="true"/> Actieve doelen ({active.length})
        </h2>
        {active.length === 0 && <p className="rounded-2xl bg-[#EAF0E9] p-5 text-sm text-[#255F50]">Er zijn nog geen doelen. Voeg je eerste doel toe.</p>}
        {active.map((item) => {
          const actions = activeActions(item);
          const totals = actions.reduce((acc, a) => {
            const p = currentProgress(a, currentWeek);
            return { done: acc.done + p.completed, target: acc.target + p.target };
          }, { done: 0, target: 0 });
          const pct = percent(totals.done, totals.target);
          return (
            <button type="button" key={item.id} onClick={() => open({ kind: "goal", goalId: item.id })}
              className="block w-full min-w-0 rounded-[23px] border border-[#D8E2D7] bg-white p-4 text-left shadow-[0_7px_26px_-22px_rgba(36,70,49,.5)] transition-colors hover:border-[#D8E2D7] sm:p-5"
              aria-label={`Bekijk doel ${item.title}`}>
              <span className="flex min-w-0 items-start justify-between gap-3">
                <span className="min-w-0 flex-1 break-words text-lg font-bold leading-tight text-[#233D34]">{item.title}</span>
                <span className="shrink-0 rounded-full bg-[#EAF0E9] px-3 py-1 text-[11px] font-medium text-[#233D34]">{labelForArea(item.area)}</span>
              </span>
              {item.motivation && <span className="mt-1.5 block truncate text-sm text-[#255F50]">{item.motivation}</span>}
              <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#255F50]">
                <span className="inline-flex items-center gap-1.5"><ClipboardList size={15} aria-hidden="true"/> {actions.length} {actions.length === 1 ? "weekactie" : "weekacties"}</span>
                {dates(item) && <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} aria-hidden="true"/>{dates(item)}</span>}
                <ChevronRight size={16} className="ml-auto shrink-0" aria-hidden="true"/>
              </span>
              {totals.target > 0 && <span className="mt-3 flex items-center gap-3">
                <span className="min-w-0 flex-1"><Bar value={pct}/></span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-[#233D34]">{pct}%</span>
              </span>}
            </button>
          );
        })}
      </section>

      {archived.length > 0 && (
        <section>
          <button type="button" onClick={() => setShowArchived(!showArchived)}
            aria-expanded={showArchived} className="flex w-full items-center gap-2 rounded-xl py-2 text-left text-sm font-semibold text-[#233D34]">
            <Archive size={17} aria-hidden="true"/> Gearchiveerde doelen ({archived.length})
            <ChevronDown className={`ml-auto size-4 transition-transform ${showArchived ? "rotate-180" : ""}`} aria-hidden="true"/>
          </button>
          {showArchived && <ul className="mt-3 space-y-2">
            {archived.map((item) => <li key={item.id} className="rounded-2xl border border-[#D8E2D7] bg-white p-4">
              <p className="font-semibold">{item.title}</p>
              {item.motivation && <p className="mt-1 text-sm text-[#255F50]">{item.motivation}</p>}
              <p className="mt-1 text-xs text-[#255F50]">{item.actions.length} bewaarde acties</p>
            </li>)}
          </ul>}
        </section>
      )}

      <dialog ref={dialog} aria-label={title} className="review-dialog goals-dialog"
        onClose={() => setView(null)}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className="mx-auto mb-3 mt-3 h-1.5 w-12 rounded-full bg-[#EAF0E9] sm:hidden" aria-hidden="true"/>
        <div className="space-y-5 px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-2 sm:px-7 sm:pb-7 sm:pt-7">
          <header className="flex min-w-0 items-start gap-3">
            {canBack && <button type="button" onClick={back} aria-label="Terug" className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#255F50] hover:bg-[#EAF0E9]"><ArrowLeft size={20}/></button>}
            <h2 className="min-w-0 flex-1 break-words pt-1 text-xl font-bold tracking-tight text-[#233D34]">{title}</h2>
            <button type="button" onClick={close} aria-label="Sluiten" className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#255F50] hover:bg-[#EAF0E9]"><X size={21}/></button>
          </header>

          {view?.kind === "new-goal" && (
            <form action={createGoal} className="space-y-4">
              <GoalFields key="new"/>
              <Button type="submit" disabled={active.length >= MAX_ACTIVE_GOALS} className="h-12 w-full">Doel toevoegen</Button>
            </form>
          )}

          {view?.kind === "edit-goal" && goal && (
            <form action={updateGoal} className="space-y-4">
              <input type="hidden" name="goalId" value={goal.id}/>
              <GoalFields key={goal.id} goal={goal}/>
              <Button type="submit" className="h-12 w-full">Wijzigingen opslaan</Button>
            </form>
          )}

          {view?.kind === "goal" && goal && (
            <div className="space-y-5">
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-[#EAF0E9] px-3 py-1 text-xs font-medium text-[#233D34]">{labelForArea(goal.area)}</span>
                {goal.motivation && <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#255F50]">{goal.motivation}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  {dates(goal) ? <span className="inline-flex items-center gap-2 text-[#255F50]"><CalendarDays size={16} aria-hidden="true"/> {dates(goal)}</span> : <span/>}
                  <button type="button" onClick={() => open({ kind: "edit-goal", goalId: goal.id })}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#233D34]"><Pencil size={16} aria-hidden="true"/> Bewerken</button>
                </div>
              </div>
              <div className="border-t border-[#D8E2D7] pt-5">
                <h3 className="mb-3 text-lg font-bold">Weekacties ({activeActions(goal).length})</h3>
                <button type="button" disabled={activeActions(goal).length >= MAX_ACTIVE_ACTIONS}
                  onClick={() => open({ kind: "new-action", goalId: goal.id })}
                  className="mb-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D8E2D7] bg-[#EAF0E9] text-sm font-semibold text-[#233D34] hover:bg-[#EAF0E9] disabled:opacity-50">
                  <Plus size={19} aria-hidden="true"/> Weekactie toevoegen
                </button>
                <div className="space-y-3">
                  {activeActions(goal).map((a) => {
                    const p = currentProgress(a, currentWeek);
                    return (
                      <button type="button" key={a.id} onClick={() => open({ kind: "action", goalId: goal.id, actionId: a.id })}
                        className="block w-full rounded-2xl border border-[#D8E2D7] bg-white p-4 text-left hover:border-[#D8E2D7]">
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 break-words font-semibold">{a.title}</span>
                          <ChevronRight size={17} className="shrink-0" aria-hidden="true"/>
                        </span>
                        <span className="mt-1.5 block text-xs tabular-nums text-[#255F50]">{p.completed} / {p.target} · {isoWeekLabel(currentWeek)}</span>
                        <span className="mt-3 block"><Bar value={percent(p.completed,p.target)}/></span>
                      </button>
                    );
                  })}
                </div>
                {activeActions(goal).length === 0 && <p className="py-3 text-sm text-muted-foreground">Nog geen weekacties.</p>}
                {goal.actions.some((a) => a.archived) && (
                  <details className="mt-4 text-sm">
                    <summary className="cursor-pointer font-medium text-[#255F50]">Gearchiveerde weekacties</summary>
                    <ul className="mt-3 space-y-2">{goal.actions.filter((a) => a.archived).map((a) =>
                      <li key={a.id} className="rounded-lg bg-[#EAF0E9] p-3">{a.title}</li>)}</ul>
                  </details>
                )}
              </div>
              <form action={archiveGoal} onSubmit={(event) => { if (!window.confirm("Dit doel en zijn acties archiveren?")) event.preventDefault(); }}>
                <input type="hidden" name="goalId" value={goal.id}/>
                <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f3ceca] bg-[#EAF0E9] text-sm font-semibold text-[#b13636]">
                  <Archive size={18} aria-hidden="true"/> Doel archiveren
                </button>
              </form>
            </div>
          )}

          {view?.kind === "new-action" && goal && (
            <form action={createHabitAction} className="space-y-4">
              <input type="hidden" name="goalId" value={goal.id}/>
              <div>
                <label htmlFor="new-action-title" className={labelClass}>Welke actie wil je uitvoeren?</label>
                <input id="new-action-title" name="title" maxLength={120} required className={inputClass} placeholder="Bijvoorbeeld: wandelen tijdens de pauze"/>
              </div>
              <div>
                <label htmlFor="new-action-target" className={labelClass}>Hoe vaak per week?</label>
                <input id="new-action-target" type="number" name="targetPerWeek" min={1} max={7} required className={inputClass} defaultValue={3}/>
              </div>
              <Button type="submit" className="h-12 w-full">Weekactie toevoegen</Button>
            </form>
          )}

          {view?.kind === "action" && goal && action && progress && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#D8E2D7] bg-[#EAF0E9] p-5">
                <p className="mb-1 text-sm text-[#255F50]">{goal.title}</p>
                <p className="text-2xl font-bold tabular-nums text-[#233D34]">{progress.completed} / {progress.target}</p>
                <p className="mb-3 text-xs text-[#255F50]">{isoWeekLabel(currentWeek)}</p>
                <Bar value={percent(progress.completed,progress.target)}/>
              </div>
              <button type="button" onClick={() => open({ kind: "experiences", goalId: goal.id, actionId: action.id })}
                className="flex min-h-13 w-full items-center gap-3 rounded-xl border border-[#D8E2D7] bg-white px-4 text-left text-sm font-semibold">
                <History size={19} aria-hidden="true"/><span className="flex-1">Ervaringen ({entries.length})</span><ChevronRight size={18} aria-hidden="true"/>
              </button>
              <button type="button" onClick={() => open({ kind: "week-note", goalId: goal.id, actionId: action.id })}
                className="flex min-h-13 w-full items-center gap-3 rounded-xl border border-[#D8E2D7] bg-white px-4 text-left text-sm font-semibold">
                <ClipboardList size={19} aria-hidden="true"/><span className="flex-1">Weekreflectie</span><ChevronRight size={18} aria-hidden="true"/>
              </button>
              <button type="button" onClick={() => open({ kind: "edit-action", goalId: goal.id, actionId: action.id })}
                className="flex min-h-13 w-full items-center gap-3 rounded-xl border border-[#D8E2D7] bg-white px-4 text-left text-sm font-semibold">
                <Pencil size={19} aria-hidden="true"/><span className="flex-1">Weekactie bewerken</span><ChevronRight size={18} aria-hidden="true"/>
              </button>
              {action.weeks.length > 0 && <details className="rounded-xl bg-[#EAF0E9] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#233D34]">Recente weekhistorie</summary>
                <ul className="mt-3 space-y-2">
                  {action.weeks.map((week) => <li key={week.id} className="rounded-xl bg-white p-3 text-sm">
                    <span className="font-medium">{weekLabel(week.weekStart)} · {week.completedCount}/{week.targetCount}</span>
                    {week.note && <p className="mt-1 whitespace-pre-wrap text-[#255F50]">{week.note}</p>}
                  </li>)}
                </ul>
              </details>}
              <form action={archiveHabitAction} onSubmit={(event) => { if (!window.confirm("Deze weekactie archiveren?")) event.preventDefault(); }}>
                <input type="hidden" name="actionId" value={action.id}/>
                <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f2d9d3] bg-[#EAF0E9] text-sm font-medium text-[#ad3838]">
                  <Archive size={17} aria-hidden="true"/> Weekactie archiveren
                </button>
              </form>
            </div>
          )}

          {view?.kind === "edit-action" && action && (
            <form action={updateHabitAction} className="space-y-4">
              <input type="hidden" name="actionId" value={action.id}/>
              <div>
                <label htmlFor="edit-action-title" className={labelClass}>Weekactie</label>
                <input id="edit-action-title" name="title" maxLength={120} required className={inputClass} defaultValue={action.title}/>
              </div>
              <div>
                <label htmlFor="edit-action-target" className={labelClass}>Keer per week</label>
                <input id="edit-action-target" type="number" name="targetPerWeek" min={1} max={7} required className={inputClass} defaultValue={action.targetPerWeek}/>
              </div>
              <p className="text-xs text-[#255F50]">Een nieuwe frequentie geldt vanaf volgende week. Je historie blijft bewaard.</p>
              <Button type="submit" className="h-12 w-full">Wijzigingen opslaan</Button>
            </form>
          )}

          {view?.kind === "week-note" && action && (
            <form action={saveWeekReflection} className="space-y-4">
              <input type="hidden" name="actionId" value={action.id}/>
              <label htmlFor="week-note" className={labelClass}>Hoe kijk je terug op deze week?</label>
              <textarea id="week-note" name="note" maxLength={500} rows={5} className={inputClass}
                defaultValue={progress?.week?.note ?? ""} placeholder="Wat ging prettig? Wat wil je onthouden?"/>
              <Button type="submit" className="h-12 w-full">Weekreflectie opslaan</Button>
            </form>
          )}

          {view?.kind === "experiences" && action && goal && (
            <div className="space-y-3">
              <p className="pb-2 text-sm text-[#255F50]">{action.title}</p>
              {entries.length === 0 ? (
                <p className="rounded-2xl bg-[#EAF0E9] p-4 text-sm text-[#255F50]">Nog geen individuele ervaringen opgeslagen.</p>
              ) : (
                <ul className="space-y-3">
                  {entries.map((entry) => {
                    const rating = entry.rating && entry.rating in experienceStyle
                      ? experienceStyle[entry.rating as keyof typeof experienceStyle] : null;
                    const Icon = rating?.icon ?? Activity;
                    return (
                      <li key={entry.id}>
                        <button type="button"
                          onClick={() => open({ kind: "edit-experience", goalId: goal.id, actionId: action.id, entryId: entry.id })}
                          aria-label={`Bekijk ervaring van ${experienceTime(entry.createdAt)}`}
                          className="flex min-h-22 w-full items-center gap-3 rounded-2xl border border-[#D8E2D7] bg-white px-3.5 py-3.5 text-left transition-colors hover:border-[#D8E2D7]">
                          <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${rating?.color ?? "bg-[#EAF0E9] text-[#255F50]"}`}>
                            <Icon size={24} aria-hidden="true"/>
                          </span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="block text-sm font-medium text-[#233D34]">{experienceTime(entry.createdAt)}</span>
                            <span className="block text-sm text-[#255F50]">
                              {rating?.text ?? "Nog niet beoordeeld"}
                              {entry.note ? " · " + entry.note : ""}
                            </span>
                          </span>
                          <ChevronRight className="size-5 shrink-0 text-[#255F50]" aria-hidden="true"/>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {view?.kind === "edit-experience" && action && selectedEntry && (
            <div className="space-y-5">
              <p className="text-sm text-[#255F50]">{action.title}</p>
              <div className="flex items-center gap-2 rounded-xl border border-[#D8E2D7] bg-[#EAF0E9] px-4 py-3 text-sm text-[#233D34]">
                <CalendarDays className="size-4 shrink-0" aria-hidden="true"/>
                {experienceTime(selectedEntry.createdAt)}
              </div>
              <EntryReviewForm key={selectedEntry.id} entry={selectedEntry} onSaved={handleReviewSaved}/>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
