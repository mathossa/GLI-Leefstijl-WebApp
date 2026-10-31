"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Archive, ArrowLeft, CalendarDays, ChevronDown, ChevronRight, ClipboardList, Ellipsis, Frown, Footprints, Heart, History, Meh, Moon, Pencil, Plus, Smile, Target, Utensils, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuidedPlanWizard } from "@/components/guided-plan-wizard";
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
  whenContext: string | null;
  confidenceScore: number | null;
  existingStrength: string | null;
  confidenceBooster: string | null;
  obstacle: string | null;
  fallbackPlan: string | null;
  archived: boolean;
  weeks: WeekView[];
};
export type GoalView = {
  id: string;
  title: string;
  motivation: string;
  progressIndicator: string | null;
  area: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  actions: HabitView[];
};

type View =
  | { kind: "new-goal" }
  | { kind: "new-goal-quick" }
  | { kind: "new-goal-guided" }
  | { kind: "goal"; goalId: string }
  | { kind: "edit-goal"; goalId: string }
  | { kind: "new-action"; goalId: string }
  | { kind: "new-action-guided"; goalId: string }
  | { kind: "action"; goalId: string; actionId: string }
  | { kind: "edit-action"; goalId: string; actionId: string }
  | { kind: "week-note"; goalId: string; actionId: string }
  | { kind: "experiences"; goalId: string; actionId: string }
  | { kind: "edit-experience"; goalId: string; actionId: string; entryId: string };

const inputClass = "mt-1.5 block w-full min-w-0 rounded-xl border border-[#cfdecf] bg-white px-3.5 py-3 text-base text-[#263e30]";
const labelClass = "block text-sm font-semibold text-[#345343]";
const labelForArea = (key: string) => GOAL_AREAS.find((item) => item.value === key)?.label ?? "Anders";
const areaStyles = {
  BEWEGING: { icon: Footprints, idle: "bg-[#e8f5e9] text-[#276a4d]", active: "border-[#81b796] bg-[#d9eedf] text-[#21583e]" },
  VOEDING: { icon: Utensils, idle: "bg-[#fff3df] text-[#a66619]", active: "border-[#efbf7d] bg-[#ffedcd] text-[#885115]" },
  SLAAP: { icon: Moon, idle: "bg-[#eaf0ff] text-[#426cae]", active: "border-[#a3b9e7] bg-[#e1eafb] text-[#305a9a]" },
  ONTSPANNING: { icon: Heart, idle: "bg-[#f6eafa] text-[#875cad]", active: "border-[#c8a8dd] bg-[#efe0f7] text-[#754aa0]" },
  SOCIAAL: { icon: Users, idle: "bg-[#fff0ef] text-[#af5e58]", active: "border-[#e9b2ad] bg-[#f9e3e1] text-[#91453e]" },
  ANDERS: { icon: Ellipsis, idle: "bg-[#f0f2f1] text-[#4e6260]", active: "border-[#abbdb6] bg-[#e0e8e3] text-[#425a4e]" },
} as const;
const experienceStyle = {
  GOED: { icon: Smile, text: "Ging goed", color: "bg-[#e8f5eb] text-[#24734e]" },
  REDELIJK: { icon: Meh, text: "Redelijk", color: "bg-[#fff4df] text-[#ad7629]" },
  LASTIG: { icon: Frown, text: "Lastig", color: "bg-[#fff0ee] text-[#b74443]" },
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
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#e6ebe5]" aria-hidden="true">
      <div className="h-full rounded-full bg-[#307856]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }}/>
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
        <label htmlFor={`goal-motivation-${prefix}`} className={labelClass}>Motivatie <span className="font-normal text-[#6b8071]">(optioneel)</span></label>
        <textarea id={`goal-motivation-${prefix}`} name="motivation" maxLength={1000} rows={3}
          className={inputClass} defaultValue={goal?.motivation ?? ""} placeholder="Waarom is dit doel belangrijk voor je?"/>
      </div>
      <div>
        <label className={labelClass} htmlFor={"goal-progress-" + prefix}>Waaraan merk je dat je vooruitgaat? <span className="font-normal text-[#6b8071]">(optioneel)</span></label>
        <textarea id={"goal-progress-" + prefix} name="progressIndicator" maxLength={500} rows={2}
          defaultValue={goal?.progressIndicator ?? ""} className={inputClass} placeholder="Bijvoorbeeld: ik voel me energieker"/>
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
  const [wizardDirty, setWizardDirty] = useState(false);
  const active = goals.filter((goal) => goal.status === "ACTIVE");
  const archived = goals.filter((goal) => goal.status !== "ACTIVE");

  function open(next: View) {
    setWizardDirty(false);
    setView(next);
    if (!dialog.current?.open) dialog.current?.showModal();
    else dialog.current.scrollTop = 0;
  }
  const isWizard = view?.kind === "new-goal-guided" || view?.kind === "new-action-guided";
  function close(force = false) {
    if (!force && isWizard && wizardDirty && !window.confirm("Je plan is nog niet opgeslagen. Wil je toch afsluiten?")) return;
    dialog.current?.close();
    setWizardDirty(false);
    setView(null);
  }
  function guidedSaved() {
    close(true);
    router.refresh();
  }
  function back() {
    if (!view || ["new-goal", "new-goal-quick", "new-goal-guided", "goal"].includes(view.kind)) { close(); return; }
    if (view.kind === "edit-goal" || view.kind === "new-action" || view.kind === "new-action-guided") {
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
  if (view?.kind === "new-goal-guided") title = "Mijn nieuwe doel";
  if (view?.kind === "new-goal-quick") title = "Snel doel toevoegen";
  if (view?.kind === "goal") title = goal?.title ?? "Doel";
  if (view?.kind === "edit-goal") title = "Doel bewerken";
  if (view?.kind === "new-action") title = "Weekactie toevoegen";
  if (view?.kind === "new-action-guided") title = "Mijn nieuwe actie";
  if (view?.kind === "action") title = action?.title ?? "Weekactie";
  if (view?.kind === "edit-action") title = "Weekactie bewerken";
  if (view?.kind === "week-note") title = "Weekreflectie";
  if (view?.kind === "experiences") title = "Ervaringen";
  if (view?.kind === "edit-experience") title = "Hoe ging het?";
  const canBack = view && !["goal", "new-goal", "new-goal-guided", "new-action-guided"].includes(view.kind);

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#203d30]">Mijn doelen</h1>
        <p className="text-sm text-[#647768]">{isoWeekLabel(currentWeek)}</p>
      </header>

      {message === "opgeslagen" && <p role="status" className="rounded-2xl bg-[#e8f3e5] p-3 text-sm text-[#2c5d40]">Wijzigingen opgeslagen.</p>}
      {message === "ongeldig" && <p role="alert" className="rounded-2xl border border-[#e2c99b] bg-[#fff5e4] p-3 text-sm text-[#815d31]">Controleer je invoer en de ingestelde limieten.</p>}

      <button type="button" onClick={() => open({ kind: active.length === 0 ? "new-goal-guided" : "new-goal" })} disabled={active.length >= MAX_ACTIVE_GOALS}
        className="flex min-h-18 w-full items-center gap-3 rounded-[22px] border border-[#d5e8d5] bg-[#edf5ec] px-4 py-3 text-left text-sm font-semibold text-[#285e41] hover:bg-[#e3f0e2] disabled:opacity-50">
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#d9ecdc]"><Plus size={21}/></span>
        <span className="min-w-0 flex-1">Nieuw doel toevoegen</span>
        <ChevronRight size={19} aria-hidden="true"/>
      </button>

      <section className="space-y-3" aria-labelledby="active-goals-title">
        <h2 id="active-goals-title" className="flex items-center gap-2 text-lg font-bold text-[#254638]">
          <Target size={21} aria-hidden="true"/> Actieve doelen ({active.length})
        </h2>
        {active.length === 0 && <p className="rounded-2xl bg-[#f2f6f0] p-5 text-sm text-[#5c7260]">Er zijn nog geen doelen. Voeg je eerste doel toe.</p>}
        {active.map((item) => {
          const actions = activeActions(item);
          const totals = actions.reduce((acc, a) => {
            const p = currentProgress(a, currentWeek);
            return { done: acc.done + p.completed, target: acc.target + p.target };
          }, { done: 0, target: 0 });
          const pct = percent(totals.done, totals.target);
          return (
            <button type="button" key={item.id} onClick={() => open({ kind: "goal", goalId: item.id })}
              className="block w-full min-w-0 rounded-[23px] border border-[#e2e8df] bg-white p-4 text-left shadow-[0_7px_26px_-22px_rgba(36,70,49,.5)] transition-colors hover:border-[#b8d4bf] sm:p-5"
              aria-label={`Bekijk doel ${item.title}`}>
              <span className="flex min-w-0 items-start justify-between gap-3">
                <span className="min-w-0 flex-1 break-words text-lg font-bold leading-tight text-[#233f31]">{item.title}</span>
                <span className="shrink-0 rounded-full bg-[#e7f1e6] px-3 py-1 text-[11px] font-medium text-[#326747]">{labelForArea(item.area)}</span>
              </span>
              {item.motivation && <span className="mt-1.5 block truncate text-sm text-[#617466]">{item.motivation}</span>}
              <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#5f7465]">
                <span className="inline-flex items-center gap-1.5"><ClipboardList size={15} aria-hidden="true"/> {actions.length} {actions.length === 1 ? "weekactie" : "weekacties"}</span>
                {dates(item) && <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} aria-hidden="true"/>{dates(item)}</span>}
                <ChevronRight size={16} className="ml-auto shrink-0" aria-hidden="true"/>
              </span>
              {totals.target > 0 && <span className="mt-3 flex items-center gap-3">
                <span className="min-w-0 flex-1"><Bar value={pct}/></span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-[#436a50]">{pct}%</span>
              </span>}
            </button>
          );
        })}
      </section>

      {archived.length > 0 && (
        <section>
          <button type="button" onClick={() => setShowArchived(!showArchived)}
            aria-expanded={showArchived} className="flex w-full items-center gap-2 rounded-xl py-2 text-left text-sm font-semibold text-[#456653]">
            <Archive size={17} aria-hidden="true"/> Gearchiveerde doelen ({archived.length})
            <ChevronDown className={`ml-auto size-4 transition-transform ${showArchived ? "rotate-180" : ""}`} aria-hidden="true"/>
          </button>
          {showArchived && <ul className="mt-3 space-y-2">
            {archived.map((item) => <li key={item.id} className="rounded-2xl border border-[#e4e8df] bg-white p-4">
              <p className="font-semibold">{item.title}</p>
              {item.motivation && <p className="mt-1 text-sm text-[#697769]">{item.motivation}</p>}
              <p className="mt-1 text-xs text-[#697769]">{item.actions.length} bewaarde acties</p>
            </li>)}
          </ul>}
        </section>
      )}

      <dialog ref={dialog} aria-label={title} className="review-dialog goals-dialog"
        onCancel={event => {
          if (isWizard && wizardDirty && !window.confirm("Je plan is nog niet opgeslagen. Wil je toch afsluiten?")) event.preventDefault();
        }}
        onClose={() => { setView(null); setWizardDirty(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className="mx-auto mb-3 mt-3 h-1.5 w-12 rounded-full bg-[#dce5db] sm:hidden" aria-hidden="true"/>
        <div className="space-y-5 px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-2 sm:px-7 sm:pb-7 sm:pt-7">
          <header className="flex min-w-0 items-start gap-3">
            {canBack && <button type="button" onClick={back} aria-label="Terug" className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#476a56] hover:bg-[#edf3ea]"><ArrowLeft size={20}/></button>}
            <h2 className="min-w-0 flex-1 break-words pt-1 text-xl font-bold tracking-tight text-[#223e31]">{title}</h2>
            <button type="button" onClick={() => close()} aria-label="Sluiten" className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#526e5a] hover:bg-[#edf3ea]"><X size={21}/></button>
          </header>

          {view?.kind === "new-goal" && (
            <div className="space-y-3">
              <p className="text-sm text-[#5e7564]">Hoe wil je jouw doel maken?</p>
              <button type="button" onClick={() => open({kind: "new-goal-guided"})}
                className="flex min-h-18 w-full items-center gap-3 rounded-xl border border-[#bad9c4] bg-[#edf6ec] p-4 text-left font-semibold text-[#2d694a]">
                <Target size={21} aria-hidden="true"/><span>Help mij op weg <span className="block text-xs font-normal">Met een paar korte vragen</span></span>
              </button>
              <button type="button" onClick={() => open({kind: "new-goal-quick"})}
                className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#d7e3d7] p-4 text-left font-semibold text-[#3b5d48]">
                <Plus size={21} aria-hidden="true"/><span>Snel toevoegen <span className="block text-xs font-normal">Zelf invullen, zonder wizard</span></span>
              </button>
            </div>
          )}

          {view?.kind === "new-goal-guided" && (
            <GuidedPlanWizard mode="new-goal" onDirty={setWizardDirty} onSaved={guidedSaved}/>
          )}
          {view?.kind === "new-action-guided" && goal && (
            <GuidedPlanWizard mode="new-action" goalId={goal.id} goalTitle={goal.title}
              onDirty={setWizardDirty} onSaved={guidedSaved}/>
          )}

          {view?.kind === "new-goal-quick" && (
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
                <span className="inline-flex rounded-full bg-[#e9f2e7] px-3 py-1 text-xs font-medium text-[#326747]">{labelForArea(goal.area)}</span>
                {goal.motivation && <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#596d60]">{goal.motivation}</p>}
                {goal.progressIndicator && <p className="whitespace-pre-wrap text-sm text-[#596d60]">Vooruitgang: {goal.progressIndicator}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  {dates(goal) ? <span className="inline-flex items-center gap-2 text-[#5d7464]"><CalendarDays size={16} aria-hidden="true"/> {dates(goal)}</span> : <span/>}
                  <button type="button" onClick={() => open({ kind: "edit-goal", goalId: goal.id })}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#2f6d4b]"><Pencil size={16} aria-hidden="true"/> Bewerken</button>
                </div>
              </div>
              <div className="border-t border-[#e1e9df] pt-5">
                <h3 className="mb-3 text-lg font-bold">Weekacties ({activeActions(goal).length})</h3>
                <button type="button" disabled={activeActions(goal).length >= MAX_ACTIVE_ACTIONS}
                  onClick={() => open({ kind: "new-action", goalId: goal.id })}
                  className="mb-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#d5e8d6] bg-[#edf5eb] text-sm font-semibold text-[#2b6949] hover:bg-[#e5f1e3] disabled:opacity-50">
                  <Plus size={19} aria-hidden="true"/> Weekactie toevoegen
                </button>
                <div className="space-y-3">
                  {activeActions(goal).map((a) => {
                    const p = currentProgress(a, currentWeek);
                    return (
                      <button type="button" key={a.id} onClick={() => open({ kind: "action", goalId: goal.id, actionId: a.id })}
                        className="block w-full rounded-2xl border border-[#e3e9e1] bg-white p-4 text-left hover:border-[#b3d1b9]">
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 break-words font-semibold">{a.title}</span>
                          <ChevronRight size={17} className="shrink-0" aria-hidden="true"/>
                        </span>
                        <span className="mt-1.5 block text-xs tabular-nums text-[#5a745f]">{p.completed} / {p.target} · {isoWeekLabel(currentWeek)}</span>
                        <span className="mt-3 block"><Bar value={percent(p.completed,p.target)}/></span>
                      </button>
                    );
                  })}
                </div>
                {activeActions(goal).length === 0 && <p className="py-3 text-sm text-muted-foreground">Nog geen weekacties.</p>}
                {goal.actions.some((a) => a.archived) && (
                  <details className="mt-4 text-sm">
                    <summary className="cursor-pointer font-medium text-[#52715a]">Gearchiveerde weekacties</summary>
                    <ul className="mt-3 space-y-2">{goal.actions.filter((a) => a.archived).map((a) =>
                      <li key={a.id} className="rounded-lg bg-[#f4f6f2] p-3">{a.title}</li>)}</ul>
                  </details>
                )}
              </div>
              <form action={archiveGoal} onSubmit={(event) => { if (!window.confirm("Dit doel en zijn acties archiveren?")) event.preventDefault(); }}>
                <input type="hidden" name="goalId" value={goal.id}/>
                <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f3ceca] bg-[#fff2ef] text-sm font-semibold text-[#b13636]">
                  <Archive size={18} aria-hidden="true"/> Doel archiveren
                </button>
              </form>
            </div>
          )}

          {view?.kind === "new-action" && goal && (
            <div className="space-y-3">
              <button type="button" onClick={() => open({kind: "new-action-guided",goalId:goal.id})}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e3f1e5] text-sm font-semibold text-[#2f6e4e]">
                <Target size={18} aria-hidden="true"/> Help mij deze actie haalbaar te maken
              </button>
              <p className="text-xs font-medium text-[#657769]">Of voeg hieronder direct een weekactie toe.</p>
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
            </div>
          )}

          {view?.kind === "action" && goal && action && progress && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#e4eae2] bg-[#f8faf6] p-5">
                <p className="mb-1 text-sm text-[#597061]">{goal.title}</p>
                <p className="text-2xl font-bold tabular-nums text-[#244b35]">{progress.completed} / {progress.target}</p>
                <p className="mb-3 text-xs text-[#5c7661]">{isoWeekLabel(currentWeek)}</p>
                <Bar value={percent(progress.completed,progress.target)}/>
              </div>
              {(action.whenContext || action.confidenceScore !== null || action.existingStrength || action.confidenceBooster || action.obstacle || action.fallbackPlan) && (
                <div className="space-y-1.5 rounded-xl border border-[#dfe9dc] bg-[#f5faf3] p-4 text-sm text-[#476550]">
                  <p className="font-semibold text-[#2c593f]">Mijn plan</p>
                  {action.whenContext && <p>Wanneer: {action.whenContext}</p>}
                  {action.confidenceScore !== null && <p>Vertrouwen bij het plannen: {action.confidenceScore}/10</p>}
                  {action.existingStrength && <p>Wat helpt: {action.existingStrength}</p>}
                  {action.confidenceBooster && <p>Een stapje makkelijker: {action.confidenceBooster}</p>}
                  {action.obstacle && <p>Obstakel: {action.obstacle}</p>}
                  {action.fallbackPlan && <p>Plan B: {action.fallbackPlan}</p>}
                </div>
              )}
              <button type="button" onClick={() => open({ kind: "experiences", goalId: goal.id, actionId: action.id })}
                className="flex min-h-13 w-full items-center gap-3 rounded-xl border border-[#e3e9e0] bg-white px-4 text-left text-sm font-semibold">
                <History size={19} aria-hidden="true"/><span className="flex-1">Ervaringen ({entries.length})</span><ChevronRight size={18} aria-hidden="true"/>
              </button>
              <button type="button" onClick={() => open({ kind: "week-note", goalId: goal.id, actionId: action.id })}
                className="flex min-h-13 w-full items-center gap-3 rounded-xl border border-[#e3e9e0] bg-white px-4 text-left text-sm font-semibold">
                <ClipboardList size={19} aria-hidden="true"/><span className="flex-1">Weekreflectie</span><ChevronRight size={18} aria-hidden="true"/>
              </button>
              <button type="button" onClick={() => open({ kind: "edit-action", goalId: goal.id, actionId: action.id })}
                className="flex min-h-13 w-full items-center gap-3 rounded-xl border border-[#e3e9e0] bg-white px-4 text-left text-sm font-semibold">
                <Pencil size={19} aria-hidden="true"/><span className="flex-1">Weekactie bewerken</span><ChevronRight size={18} aria-hidden="true"/>
              </button>
              {action.weeks.length > 0 && <details className="rounded-xl bg-[#f3f6f1] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#3b6147]">Recente weekhistorie</summary>
                <ul className="mt-3 space-y-2">
                  {action.weeks.map((week) => <li key={week.id} className="rounded-xl bg-white p-3 text-sm">
                    <span className="font-medium">{weekLabel(week.weekStart)} · {week.completedCount}/{week.targetCount}</span>
                    {week.note && <p className="mt-1 whitespace-pre-wrap text-[#647569]">{week.note}</p>}
                  </li>)}
                </ul>
              </details>}
              <form action={archiveHabitAction} onSubmit={(event) => { if (!window.confirm("Deze weekactie archiveren?")) event.preventDefault(); }}>
                <input type="hidden" name="actionId" value={action.id}/>
                <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f2d9d3] bg-[#fff8f5] text-sm font-medium text-[#ad3838]">
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
              <div>
                <label className={labelClass} htmlFor="edit-when">Wanneer past dit het beste? (optioneel)</label>
                <input id="edit-when" className={inputClass} name="whenContext" maxLength={250} defaultValue={action.whenContext ?? ""}/>
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-confidence">Vertrouwen 1–10 (optioneel)</label>
                <input id="edit-confidence" className={inputClass} type="number" inputMode="numeric" min={1} max={10}
                  name="confidenceScore" defaultValue={action.confidenceScore ?? ""}/>
              </div>
              {([
                ["existingStrength", "Wat helpt je nu al?", action.existingStrength],
                ["confidenceBooster", "Wat zou het makkelijker maken?", action.confidenceBooster],
                ["obstacle", "Wat kan het lastig maken?", action.obstacle],
                ["fallbackPlan", "Wat kun je dan doen?", action.fallbackPlan],
              ] as const).map(([name, label, value]) => (
                <div key={name}>
                  <label className={labelClass} htmlFor={"edit-" + name}>{label} (optioneel)</label>
                  <textarea className={inputClass} id={"edit-" + name} name={name} rows={2} maxLength={500}
                    defaultValue={value ?? ""}/>
                </div>
              ))}
              <p className="text-xs text-[#657769]">Een nieuwe frequentie geldt vanaf volgende week. Je historie blijft bewaard.</p>
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
              <p className="pb-2 text-sm text-[#5d7163]">{action.title}</p>
              {entries.length === 0 ? (
                <p className="rounded-2xl bg-[#f2f6f0] p-4 text-sm text-[#597160]">Nog geen individuele ervaringen opgeslagen.</p>
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
                          className="flex min-h-22 w-full items-center gap-3 rounded-2xl border border-[#e4e9e2] bg-white px-3.5 py-3.5 text-left transition-colors hover:border-[#a7cdb3]">
                          <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${rating?.color ?? "bg-[#f0f3ef] text-[#597265]"}`}>
                            <Icon size={24} aria-hidden="true"/>
                          </span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="block text-sm font-medium text-[#2e4738]">{experienceTime(entry.createdAt)}</span>
                            <span className="block text-sm text-[#5e7164]">
                              {rating?.text ?? "Nog niet beoordeeld"}
                              {entry.note ? " · " + entry.note : ""}
                            </span>
                          </span>
                          <ChevronRight className="size-5 shrink-0 text-[#6a8370]" aria-hidden="true"/>
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
              <p className="text-sm text-[#586e60]">{action.title}</p>
              <div className="flex items-center gap-2 rounded-xl border border-[#e1e8df] bg-[#fafbf8] px-4 py-3 text-sm text-[#315242]">
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
