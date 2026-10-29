"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

function ReviewForm({ entry, onSaved }: { entry: EntryView; onSaved: () => void }) {
  const [state, submit, pending] = useActionState(saveEntryFeedback, initial);
  const [rating, setRating] = useState<Rating>(
    entry.rating === "GOED" || entry.rating === "REDELIJK" || entry.rating === "LASTIG"
      ? entry.rating : "",
  );
  const noteId = useId();

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={submit} className="space-y-5">
      <input type="hidden" name="entryId" value={entry.id}/>
      <input type="hidden" name="rating" value={rating}/>
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-[#415d4c]">Hoe ging het deze keer?</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {ratingOptions.map(({ value, label, icon: Icon }) => (
            <button type="button" key={value} onClick={() => setRating(current => current === value ? "" : value)}
              aria-pressed={rating === value}
              className={`flex min-h-25 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-xs font-semibold transition-colors sm:min-h-29 sm:text-sm ${
                rating === value
                  ? "border-[#2e7757] bg-[#e6f1e6] text-[#25583f] ring-1 ring-[#2e7757]"
                  : "border-[#dfe7df] bg-white text-[#4b6257] hover:bg-[#f5f8f3]"
              }`}>
              <Icon size={27} strokeWidth={1.8} aria-hidden="true"/>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={noteId} className="mb-2 block text-sm font-medium text-[#415d4c]">Wil je iets onthouden? <span className="font-normal text-muted-foreground">(optioneel)</span></label>
        <textarea id={noteId} name="note" rows={3} maxLength={500}
          defaultValue={entry.note ?? ""}
          placeholder="Bijvoorbeeld: buiten zijn gaf me rust"
          className="block min-h-24 w-full resize-y rounded-2xl border border-[#d6e1d7] bg-white px-4 py-3 text-sm outline-offset-2 focus-visible:outline-[#2c7155]"/>
      </div>
      {state.message && !state.ok && <p role="alert" className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-2xl text-base">
        {pending ? "Opslaan…" : "Ervaring opslaan"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Een beoordeling is nooit verplicht. Je registratie blijft ook zonder ervaring bewaard.</p>
    </form>
  );
}

export function ActionReviewSheet({ actionTitle, goalTitle, entries }: {
  actionTitle: string;
  goalTitle: string;
  entries: EntryView[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const titleId = useId();
  const [entryId, setEntryId] = useState(entries[0]?.id ?? "");

  const selected = entries.find(entry => entry.id === entryId) ?? entries[0];
  const onSaved = useCallback(() => {
    dialog.current?.close();
    router.refresh();
  }, [router]);

  function open() {
    setEntryId(entries[0]?.id ?? "");
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" onClick={open}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-offset-4 transition-colors hover:text-[#276448]"
        aria-label={`Bekijk ${actionTitle} en beoordeel een uitgevoerde actie`}>
        <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f1e8] text-[#377859] min-[390px]:flex" aria-hidden="true">
          <MessageCircle size={21} strokeWidth={1.8}/>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-bold uppercase tracking-[.12em] text-[#5c806b]">{goalTitle}</span>
          <span className="mt-0.5 block truncate text-base font-bold text-[#203e30] sm:text-lg">{actionTitle}</span>
          <span className="mt-1 flex items-center gap-1 text-xs text-[#607669]">Tik voor je ervaring <ChevronRight size={13} aria-hidden="true"/></span>
        </span>
      </button>

      <dialog ref={dialog} aria-labelledby={titleId} className="review-dialog"
        onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className="mx-auto mb-5 mt-3 h-1.5 w-12 rounded-full bg-[#dae2dc] sm:hidden" aria-hidden="true"/>
        <div className="px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-2 sm:px-7 sm:pb-7 sm:pt-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-[#e7f1e7] text-[#2d7454]" aria-hidden="true"><MessageCircle size={24}/></span>
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-lg font-bold text-[#203c2e]">{actionTitle}</h2>
                <p className="truncate text-sm text-[#6a7c70]">{goalTitle}</p>
              </div>
            </div>
            <button type="button" onClick={() => dialog.current?.close()}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#53675c] hover:bg-[#edf3ed]" aria-label="Sluiten">
              <X size={21} aria-hidden="true"/>
            </button>
          </div>

          {selected ? (
            <>
              <h3 className="mb-1 text-2xl font-bold tracking-tight text-[#203c2e]">Hoe ging het?</h3>
              <p className="mb-5 text-sm text-[#61776a]">Hoe was het om deze actie uit te voeren?</p>
              {entries.length > 1 && (
                <div className="mb-5">
                  <label htmlFor={titleId + "-entry"} className="mb-1 block text-xs font-semibold text-[#546c5d]">Welke uitvoering?</label>
                  <select id={titleId + "-entry"} value={selected.id} onChange={event => setEntryId(event.target.value)}
                    className="w-full rounded-xl border border-[#d8e4d8] bg-[#f7faf5] p-3 text-sm text-[#2d4e3a]">
                    {entries.map((entry,index) => <option key={entry.id} value={entry.id}>
                      {index === 0 ? "Laatste keer · " : ""}{formatTime(entry.createdAt)}
                    </option>)}
                  </select>
                </div>
              )}
              <ReviewForm key={selected.id} entry={selected} onSaved={onSaved}/>
            </>
          ) : (
            <div className="space-y-3 rounded-2xl bg-[#f2f6ef] p-5">
              <h3 className="font-semibold text-[#294c39]">Nog geen uitvoering vastgelegd</h3>
              <p className="text-sm leading-relaxed text-[#5c7462]">Tik eerst op het vinkje bij deze actie om hem te registreren. Daarna kun je hier vertellen hoe het ging.</p>
              <button type="button" onClick={() => dialog.current?.close()} className="text-sm font-semibold text-[#2a7150] underline">Begrepen</button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
