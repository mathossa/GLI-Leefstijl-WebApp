"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronRight, Frown, Meh, MessageCircle, Smile, X } from "lucide-react";
import { saveEntryFeedback, type EntryFeedbackState } from "@/app/dashboard/doelen/actions";
import { Button } from "@/components/ui/button";
import type { EntryView } from "@/components/action-entry-feedback";

type Rating = "" | "GOED" | "REDELIJK" | "LASTIG";
const initial: EntryFeedbackState = { ok: false, message: "" };
const formatTime = (value: string) => new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

const ratingOptions: { value: Rating; label: string; icon: typeof Smile }[] = [
  { value: "GOED", label: "Ging goed", icon: Smile },
  { value: "REDELIJK", label: "Ging redelijk", icon: Meh },
  { value: "LASTIG", label: "Was lastig", icon: Frown },
];

export function EntryReviewForm({ entry, onSaved }: { entry: EntryView; onSaved: () => void }) {
  const [state, submit, pending] = useActionState(saveEntryFeedback, initial);
  const [rating, setRating] = useState<Rating>(
    entry.rating === "GOED" || entry.rating === "REDELIJK" || entry.rating === "LASTIG"
      ? entry.rating : "",
  );
  const noteId = useId();

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="entryId" value={entry.id}/>
      <input type="hidden" name="rating" value={rating}/>
      <fieldset className="min-w-0">
        <legend className="sr-only">Beoordeling van deze uitvoering</legend>
        <div className="grid grid-cols-3 gap-2">
          {ratingOptions.map(({ value, label, icon: Icon }) => (
            <button type="button" key={value} onClick={() => setRating(current => current === value ? "" : value)}
              aria-pressed={rating === value}
              className={`flex min-h-25 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-xs font-semibold transition-colors sm:min-h-29 sm:text-sm ${
                rating === value
                  ? value === "GOED"
                    ? "border-[#D8E2D7] bg-[#EAF0E9] text-[#233D34] ring-1 ring-[#D8E2D7]"
                    : value === "REDELIJK"
                      ? "border-[#e2c38c] bg-[#fff3de] text-[#9b6825] ring-1 ring-[#e2c38c]"
                      : "border-[#ebb0aa] bg-[#EAF0E9] text-[#a73434] ring-1 ring-[#ebb0aa]"
                  : "border-[#D8E2D7] bg-white text-[#255F50] hover:bg-[#EAF0E9]"
              }`}>
              <Icon size={27} strokeWidth={1.8} aria-hidden="true"/>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={noteId} className="mb-2 block text-sm font-medium text-[#233D34]">Wil je iets onthouden? <span className="font-normal text-muted-foreground">(optioneel)</span></label>
        <textarea id={noteId} name="note" rows={3} maxLength={500}
          defaultValue={entry.note ?? ""}
          placeholder="Bijvoorbeeld: buiten zijn gaf me rust"
          className="block min-h-24 w-full resize-y rounded-2xl border border-[#D8E2D7] bg-white px-4 py-3 text-base outline-offset-2 focus-visible:outline-[#233D34]"/>
      </div>
      {state.message && !state.ok && <p role="alert" className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-2xl text-base">
        {pending ? "Opslaan…" : "Ervaring opslaan"}
      </Button>
    </form>
  );
}

export function ActionReviewSheet({ actionTitle, goalTitle, entries }: {
  actionTitle: string;
  goalTitle: string;
  entries: EntryView[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [entryId, setEntryId] = useState(entries[0]?.id ?? "");

  const selected = entries.find(entry => entry.id === entryId) ?? entries[0];
  const onSaved = useCallback(() => {
    dialog.current?.close();
  }, []);

  function open() {
    setEntryId(entries[0]?.id ?? "");
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" onClick={open}
        className="group flex min-h-10 w-full min-w-0 items-start justify-between gap-3 rounded-xl text-left outline-offset-4 transition-colors hover:text-[#233D34]"
        aria-label={`Bekijk ervaringen voor ${actionTitle}`}>
        <span className="min-w-0 flex-1 break-words text-base font-bold leading-snug text-[#233D34] sm:text-lg">{actionTitle}</span>
        <ChevronRight size={18} className="mt-0.5 shrink-0 text-[#255F50] transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
      </button>

      <dialog ref={dialog} aria-labelledby={titleId} className="review-dialog"
        onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className="mx-auto mb-4 mt-3 h-1.5 w-12 rounded-full bg-[#EAF0E9] sm:hidden" aria-hidden="true"/>
        <div className="px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-2 sm:px-7 sm:pb-7 sm:pt-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-[#EAF0E9] text-[#233D34]" aria-hidden="true"><MessageCircle size={24}/></span>
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-lg font-bold text-[#233D34]">{actionTitle}</h2>
                <p className="truncate text-sm text-[#255F50]">{goalTitle}</p>
              </div>
            </div>
            <button type="button" onClick={() => dialog.current?.close()}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#255F50] hover:bg-[#EAF0E9]" aria-label="Sluiten">
              <X size={21} aria-hidden="true"/>
            </button>
          </div>

          {selected ? (
            <>
              <h3 className="mb-1 text-2xl font-bold tracking-tight text-[#233D34]">Hoe ging het?</h3>
              <div className="mb-4"/>
              {entries.length > 1 && (
                <div className="mb-5">
                  <label htmlFor={titleId + "-entry"} className="mb-1 block text-xs font-semibold text-[#255F50]">Welke uitvoering?</label>
                  <select id={titleId + "-entry"} value={selected.id} onChange={event => setEntryId(event.target.value)}
                    className="w-full rounded-xl border border-[#D8E2D7] bg-[#EAF0E9] p-3 text-sm text-[#233D34]">
                    {entries.map((entry,index) => <option key={entry.id} value={entry.id}>
                      {index === 0 ? "Laatste keer · " : ""}{formatTime(entry.createdAt)}
                    </option>)}
                  </select>
                </div>
              )}
              <EntryReviewForm key={selected.id} entry={selected} onSaved={onSaved}/>
            </>
          ) : (
            <div className="space-y-3 rounded-2xl bg-[#EAF0E9] p-5">
              <h3 className="font-semibold text-[#233D34]">Nog geen uitvoering vastgelegd</h3>
              <p className="text-sm leading-relaxed text-[#255F50]">Tik eerst op het vinkje bij deze actie om hem te registreren. Daarna kun je hier vertellen hoe het ging.</p>
              <button type="button" onClick={() => dialog.current?.close()} className="text-sm font-semibold text-[#233D34] underline">Begrepen</button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
