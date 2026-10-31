"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveEntryFeedback, type EntryFeedbackState } from "@/app/dashboard/doelen/actions";

export type EntryView = {
  id: string;
  createdAt: string;
  rating: string | null;
  note: string | null;
};

const labels: Record<string, string> = { GOED: "Ging goed", REDELIJK: "Ging redelijk", LASTIG: "Was lastig" };
const initial: EntryFeedbackState = { ok: false, message: "" };
const when = (iso: string) => new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam", weekday: "short", day: "numeric", month: "short",
  hour: "2-digit", minute: "2-digit",
}).format(new Date(iso));

// Optional after the fact; editing one entry never changes the weekly counter.
function EntryEditor({ entry }: { entry: EntryView }) {
  const [state, submit, pending] = useActionState(saveEntryFeedback, initial);
  return (
    <li className="rounded-xl border border-[#D8E2D7] bg-white px-3 py-2.5">
      <details>
        <summary className="cursor-pointer text-sm font-medium text-[#233D34]">
          {when(entry.createdAt)} · {entry.rating ? labels[entry.rating] : "Hoe ging het?"}
          {entry.note && <span className="ml-1 text-xs text-muted-foreground">· Notitie</span>}
        </summary>
        <form action={submit} className="mt-3 space-y-3">
          <input type="hidden" name="entryId" value={entry.id}/>
          <div>
            <label htmlFor={`rating-${entry.id}`} className="block text-sm font-medium">Hoe ging het deze keer? (optioneel)</label>
            <select id={`rating-${entry.id}`} name="rating" defaultValue={entry.rating ?? ""}
              className="mt-1 w-full rounded-xl border border-[#D8E2D7] bg-white px-3 py-2.5 text-sm">
              <option value="">Liever niet beoordelen</option>
              <option value="GOED">Ging goed</option>
              <option value="REDELIJK">Ging redelijk</option>
              <option value="LASTIG">Was lastig</option>
            </select>
          </div>
          <div>
            <label htmlFor={`entry-note-${entry.id}`} className="block text-sm font-medium">Wil je iets onthouden? (optioneel)</label>
            <textarea id={`entry-note-${entry.id}`} name="note" maxLength={500} rows={2}
              defaultValue={entry.note ?? ""} placeholder="Bijvoorbeeld: buiten wandelen hielp me ontspannen"
              className="mt-1 w-full rounded-xl border border-[#D8E2D7] bg-white px-3 py-2.5 text-sm"/>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Opslaan…" : "Ervaring opslaan"}</Button>
            {state.message && <span role={state.ok ? "status" : "alert"} className="text-xs text-muted-foreground">{state.message}</span>}
          </div>
        </form>
      </details>
    </li>
  );
}

export function ActionEntryFeedback({ entries, label = "Ervaringen per keer" }: { entries: EntryView[]; label?: string }) {
  return (
    <details className="rounded-xl border border-[#D8E2D7] bg-[#EAF0E9] p-3">
      <summary className="cursor-pointer text-sm font-medium text-[#233D34]">{label} ({entries.length})</summary>
      <div className="mt-3 space-y-2">
        {entries.length > 0 ? (
          <ol className="space-y-2">{entries.map((entry) => <EntryEditor key={entry.id} entry={entry}/>)}</ol>
        ) : <p className="text-xs text-muted-foreground">Vanaf je volgende registratie kun je per keer een ervaring toevoegen. Eerdere weektotalen blijven bewaard.</p>}
        <p className="text-xs text-muted-foreground">Feedback is vrijblijvend; registreren kan altijd met één tik.</p>
      </div>
    </details>
  );
}
