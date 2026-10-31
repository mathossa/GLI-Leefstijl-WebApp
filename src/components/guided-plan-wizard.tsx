"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createGuidedPlan } from "@/app/dashboard/doelen/actions";
import { GOAL_AREAS } from "@/lib/goals-domain.mjs";

type Mode = "new-goal" | "new-action";
type Draft = {
  goalTitle: string; goalArea: string; goalMotivation: string; goalProgressIndicator: string;
  startDate: string; endDate: string; actionTitle: string; actionFrequency: string;
  whenContext: string; confidenceScore: string; existingStrength: string;
  confidenceBooster: string; obstacle: string; fallbackPlan: string;
};
type Props = {
  mode: Mode; goalId?: string; goalTitle?: string;
  onDirty: (dirty: boolean) => void; onSaved: (goalId: string) => void;
  onQuick: () => void;
};
const inputClass = "mt-1.5 block min-h-12 w-full min-w-0 rounded-xl border border-[#cfdecf] bg-white px-3.5 py-3 text-base text-[#263e30] focus-visible:outline-[#38795a]";
const labelClass = "block text-sm font-semibold text-[#345343]";
const initial: Draft = {
  goalTitle: "", goalArea: "BEWEGING", goalMotivation: "", goalProgressIndicator: "",
  startDate: "", endDate: "", actionTitle: "", actionFrequency: "3",
  whenContext: "", confidenceScore: "", existingStrength: "",
  confidenceBooster: "", obstacle: "", fallbackPlan: "",
};

export function GuidedPlanWizard({ mode, goalId, goalTitle, onDirty, onSaved, onQuick }: Props) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [step, setStep] = useState(mode === "new-goal" ? 0 : 1);
  const [includeAction, setIncludeAction] = useState(true);
  const [planB, setPlanB] = useState(false);
  const [moreGoal, setMoreGoal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const start = mode === "new-goal" ? 0 : 1;
  const total = mode === "new-goal" ? 4 : 3;

  useEffect(() => { heading.current?.focus(); }, [step]);
  const update = (key: keyof Draft, value: string) => {
    setDraft(old => ({ ...old, [key]: value }));
    onDirty(true);
    setError("");
  };
  const next = () => {
    if (step === 0 && !draft.goalTitle.trim()) {
      setError("Geef je doel een naam."); return;
    }
    if (step === 1 && includeAction && (!draft.actionTitle.trim() || !/^[1-7]$/.test(draft.actionFrequency))) {
      setError("Vul een actie in en kies hoe vaak je deze wilt doen."); return;
    }
    setError("");
    setStep(old => Math.min(3, old + 1));
  };
  const save = async () => {
    if (saving) return;
    setError("");
    setSaving(true);
    const data = new FormData();
    data.set("mode", mode);
    data.set("includeAction", includeAction ? "yes" : "no");
    if (goalId) data.set("goalId", goalId);
    for (const [key, value] of Object.entries(draft)) data.set(key, value);
    try {
      const result = await createGuidedPlan(data);
      if (result.ok && result.goalId) onSaved(result.goalId);
      else setError(result.message || "Opslaan is niet gelukt.");
    } catch {
      setError("Opslaan is niet gelukt. Controleer je verbinding en probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };
  const actualStep = step - start + 1;
  const textField = (id: keyof Draft, label: string, example: string, limit: number, lines = 1) => (
    <div>
      <label className={labelClass} htmlFor={"wizard-" + id}>{label}</label>
      {lines > 1 ? (
        <textarea id={"wizard-" + id} className={inputClass} rows={lines} maxLength={limit}
          value={draft[id]} onChange={event => update(id, event.target.value)} placeholder={example} />
      ) : (
        <input id={"wizard-" + id} className={inputClass} maxLength={limit}
          value={draft[id]} onChange={event => update(id, event.target.value)} placeholder={example} />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2" aria-label={"Stap " + actualStep + " van " + total}>
        <div className="flex items-center justify-between text-xs text-[#5d7464]">
          <span className="inline-flex items-center gap-2"><Compass size={17} aria-hidden="true"/> Help mij op weg</span>
          <span>Stap {actualStep} van {total}</span>
        </div>
        {step === start && <button type="button" onClick={onQuick}
          className="min-h-10 text-left text-xs font-semibold text-[#327451] underline underline-offset-4">
          Liever snel toevoegen zonder wizard?
        </button>}
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={"h-1.5 flex-1 rounded-full " + (i < actualStep ? "bg-[#438968]" : "bg-[#e3e9df]")}/>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h3 ref={heading} tabIndex={-1} className="text-xl font-bold text-[#243f31] outline-none">Wat zou jij willen veranderen?</h3>
            <p className="mt-1 text-sm text-[#607567]">Begin met iets dat voor jou belangrijk is. Het hoeft niet perfect.</p>
          </div>
          {textField("goalTitle", "Mijn doel", "Bijvoorbeeld: meer energie krijgen", 120)}
          <fieldset>
            <legend className={labelClass}>Leefstijlgebied</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {GOAL_AREAS.map(area => (
                <button key={area.value} type="button" aria-pressed={draft.goalArea === area.value}
                  onClick={() => update("goalArea", area.value)}
                  className={"min-h-12 rounded-xl border p-2 text-sm font-semibold " +
                    (draft.goalArea === area.value ? "border-[#6aa782] bg-[#e0f1e5] text-[#24563d]" : "border-[#e1e9e0] bg-white text-[#607567]")}>
                  {area.label}
                </button>
              ))}
            </div>
          </fieldset>
          {textField("goalMotivation", "Waarom is dit belangrijk voor jou? (optioneel)", "Wat zou dit voor je betekenen?", 1000, 2)}
          {textField("goalProgressIndicator", "Waaraan merk je dat je vooruitgaat? (optioneel)", "Bijvoorbeeld: ik voel me energieker", 500, 2)}
          <button type="button" onClick={() => setMoreGoal(!moreGoal)}
            className="text-sm font-semibold text-[#327451]" aria-expanded={moreGoal}>
            {moreGoal ? "Datums verbergen" : "Start- of einddatum toevoegen (optioneel)"}
          </button>
          {moreGoal && <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Startdatum
              <input type="date" className={inputClass} value={draft.startDate}
                onChange={event => update("startDate", event.target.value)}/>
            </label>
            <label className={labelClass}>Einddatum
              <input type="date" className={inputClass} value={draft.endDate}
                onChange={event => update("endDate", event.target.value)}/>
            </label>
          </div>}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 ref={heading} tabIndex={-1} className="text-xl font-bold text-[#243f31] outline-none">Wat wordt jouw eerste kleine stap?</h3>
            <p className="mt-1 text-sm text-[#607567]">Kies iets dat in jouw gewone week past.</p>
            {mode === "new-action" && <p className="mt-2 text-xs font-medium text-[#3b7255]">Doel: {goalTitle}</p>}
          </div>
          {textField("actionTitle", "Wat ga je precies doen?", "Bijvoorbeeld: 20 minuten wandelen", 120)}
          <fieldset>
            <legend className={labelClass}>Hoe vaak per week?</legend>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {Array.from({length:7},(_,i)=>String(i+1)).map(value => (
                <button key={value} type="button" aria-pressed={draft.actionFrequency === value}
                  onClick={() => update("actionFrequency", value)}
                  className={"min-h-11 rounded-lg border text-sm font-semibold " +
                    (draft.actionFrequency === value ? "border-[#6aa782] bg-[#dcefe0] text-[#24563d]" : "border-[#d9e4d8] bg-white text-[#5b7462]")}>
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          {textField("whenContext", "Wanneer past dit het beste? (optioneel)", "Bijvoorbeeld: na het avondeten", 250)}
          {mode === "new-goal" && (
            <button type="button" className="min-h-11 w-full rounded-xl border border-[#d4e4d3] px-3 text-sm font-semibold text-[#327451]"
              onClick={() => { setIncludeAction(false); onDirty(true); setError(""); setStep(3); }}>
              Nu alleen mijn doel opslaan
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 ref={heading} tabIndex={-1} className="text-xl font-bold text-[#243f31] outline-none">Denk je dat dit gaat lukken?</h3>
            <p className="mt-1 text-sm text-[#607567]">Het is geen toets. Je mag je actie altijd aanpassen.</p>
          </div>
          <div className="rounded-xl bg-[#f2f7f0] p-3">
            <p className="font-semibold text-[#2d503c]">{draft.actionTitle}</p>
            <p className="text-xs text-[#627968]">{draft.actionFrequency} keer per week{draft.whenContext ? " · " + draft.whenContext : ""}</p>
          </div>
          <fieldset>
            <legend className={labelClass}>Hoeveel vertrouwen heb je dat dit lukt? (optioneel)</legend>
            <p className="mt-1 text-xs text-[#637768]">1 = weinig vertrouwen, 10 = heel veel vertrouwen. Tik opnieuw om je keuze te wissen.</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {Array.from({length:10}, (_,i)=>String(i+1)).map(value => (
                <button key={value} type="button" aria-pressed={draft.confidenceScore === value}
                  onClick={() => update("confidenceScore", draft.confidenceScore === value ? "" : value)}
                  className={"min-h-12 rounded-xl border text-sm font-semibold " +
                    (draft.confidenceScore === value ? "border-[#5b9a74] bg-[#ddf0e2] text-[#23563b]" : "border-[#d9e4d8] bg-white text-[#526d5c]")}>
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          {draft.confidenceScore && Number(draft.confidenceScore) <= 6 && (
            <div className="flex gap-2 rounded-xl bg-[#f2f7f0] p-3 text-sm text-[#4a7158]">
              <Lightbulb size={18} className="shrink-0" aria-hidden="true"/>
              <span>Misschien kun je iets kleiner beginnen. Kies wat voor jou haalbaar voelt.</span>
            </div>
          )}
          {textField("existingStrength", "Wat helpt je nu al? (optioneel)", "Bijvoorbeeld: ik vind het fijn om buiten te zijn", 500, 2)}
          {draft.confidenceScore && Number(draft.confidenceScore) < 10 &&
            textField("confidenceBooster", "Wat zou je helpen om van " + draft.confidenceScore + " naar " + (Number(draft.confidenceScore) + 1) + " te komen? (optioneel)", "Bijvoorbeeld: samen met iemand beginnen", 500, 2)}
          <button type="button" aria-expanded={planB} onClick={() => setPlanB(!planB)}
            className="min-h-11 w-full rounded-xl border border-[#d3e2d0] px-3 text-sm font-semibold text-[#327451]">
            {planB ? "Plan B verbergen" : "Een plan B bedenken (optioneel)"}
          </button>
          {planB && <div className="space-y-3">
            {textField("obstacle", "Wat zou het lastig kunnen maken?", "Als ik moe ben na werk...", 500, 2)}
            {textField("fallbackPlan", "Wat doe je dan?", "Dan ga ik 5 minuten naar buiten", 500, 2)}
          </div>}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 ref={heading} tabIndex={-1} className="text-xl font-bold text-[#243f31] outline-none">
              <CheckCircle2 size={22} className="mr-2 inline text-[#438968]" aria-hidden="true"/>Je hebt een plan!
            </h3>
            <p className="mt-1 text-sm text-[#607567]">Kijk nog even of dit bij jou past.</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-[#dbe6d9] bg-[#f8fbf7] p-4">
            {mode === "new-goal" && <div>
              <p className="text-xs text-[#687c6c]">Mijn doel</p>
              <p className="font-bold text-[#2b4835]">{draft.goalTitle}</p>
              {draft.goalMotivation && <p className="mt-1 text-sm text-[#607567]">{draft.goalMotivation}</p>}
              {draft.goalProgressIndicator && <p className="mt-1 text-xs text-[#607567]">Vooruitgang: {draft.goalProgressIndicator}</p>}
            </div>}
            {includeAction && <div>
              <p className="text-xs text-[#687c6c]">Mijn eerste stap</p>
              <p className="font-bold text-[#2b4835]">{draft.actionTitle}</p>
              <p className="text-sm text-[#607567]">{draft.actionFrequency} keer per week{draft.whenContext ? " · " + draft.whenContext : ""}</p>
              {draft.confidenceScore && <p className="mt-1 text-xs text-[#607567]">Vertrouwen: {draft.confidenceScore}/10</p>}
              {draft.fallbackPlan && <p className="mt-1 text-xs text-[#607567]">Plan B: {draft.fallbackPlan}</p>}
            </div>}
            {!includeAction && <p className="text-sm text-[#607567]">Je kunt later altijd een actie toevoegen.</p>}
          </div>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-[#e8b8a9] bg-[#fff2ee] p-3 text-sm text-[#993e35]">{error}</p>}
      <div className="flex gap-3 border-t border-[#e2ebe0] pt-4">
        <Button type="button" variant="outline" disabled={saving}
          onClick={() => {
            setError("");
            if (step === 3 && !includeAction) { setIncludeAction(true); setStep(1); }
            else setStep(old => Math.max(start, old - 1));
          }}
          className="h-12 flex-1" aria-label="Vorige stap"><ArrowLeft size={17}/> Terug</Button>
        {step < 3 ? (
          <Button type="button" onClick={next} className="h-12 flex-1">Volgende <ArrowRight size={17}/></Button>
        ) : (
          <Button type="button" disabled={saving} onClick={save} className="h-12 flex-1">
            {saving ? "Opslaan…" : "Mijn plan opslaan"}
          </Button>
        )}
      </div>
    </div>
  );
}
