"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Sparkles, X } from "lucide-react";
import { saveMotivationPreference } from "@/app/dashboard/motivation-actions";

export function MotivationQuote({ quote, mode, customText }: {
  quote: string;
  mode: "AUTO" | "CUSTOM";
  customText: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const inputId = useId();
  const router = useRouter();
  const [selected, setSelected] = useState<"AUTO" | "CUSTOM">(mode);
  const [draft, setDraft] = useState(customText);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function open() {
    setSelected(mode);
    setDraft(customText);
    setError("");
    dialog.current?.showModal();
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await saveMotivationPreference(selected, draft);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        dialog.current?.close();
        router.refresh();
      } catch {
        setError("Opslaan lukte niet. Probeer het opnieuw.");
      }
    });
  }

  return (
    <>
      <p className="max-w-prose break-words text-sm leading-relaxed text-[#36594D] sm:text-base">{quote}</p>
      <button type="button" onClick={open} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg text-xs font-semibold text-[#255F50] underline underline-offset-4 hover:text-[#17483D]" aria-label="Motivatietekst aanpassen">
        <Pencil size={13} aria-hidden="true"/> Motivatie aanpassen
      </button>
      <dialog ref={dialog} aria-labelledby={titleId} className="review-dialog"
        onClick={(event) => { if (event.target === event.currentTarget && !pending) dialog.current?.close(); }}>
        <div className="mx-auto mb-4 mt-3 h-1.5 w-12 rounded-full bg-[#EAF0E9] sm:hidden" aria-hidden="true"/>
        <div className="px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-2 sm:px-7 sm:pb-7 sm:pt-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF0E9] text-[#255F50]"><Sparkles size={23}/></span>
              <div className="min-w-0">
                <h2 id={titleId} className="text-xl font-bold text-[#233D34]">Jouw motivatie</h2>
                <p className="text-sm text-[#536B60]">Kies wat je op Vandaag wilt lezen.</p>
              </div>
            </div>
            <button type="button" onClick={() => { if (!pending) dialog.current?.close(); }}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#255F50] hover:bg-[#EAF0E9]"
              aria-label="Sluiten" disabled={pending}>
              <X size={21} aria-hidden="true"/>
            </button>
          </div>
          <form onSubmit={save} className="space-y-4">
            <div role="group" aria-label="Soort motivatietekst" className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={selected === "AUTO"} disabled={pending}
                onClick={() => setSelected("AUTO")}
                className={`min-h-12 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${selected === "AUTO" ? "border-[#255F50] bg-[#EAF0E9] text-[#233D34]" : "border-[#D8E2D7] bg-white text-[#536B60]"}`}>
                Dagelijks nieuw
              </button>
              <button type="button" aria-pressed={selected === "CUSTOM"} disabled={pending}
                onClick={() => setSelected("CUSTOM")}
                className={`min-h-12 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${selected === "CUSTOM" ? "border-[#255F50] bg-[#EAF0E9] text-[#233D34]" : "border-[#D8E2D7] bg-white text-[#536B60]"}`}>
                Eigen tekst
              </button>
            </div>
            {selected === "AUTO" ? (
              <p className="rounded-xl bg-[#F4F5EF] p-3 text-sm text-[#536B60]">Je ziet elke Amsterdamse kalenderdag een andere tekst uit de bibliotheek. Je eigen tekst blijft bewaard.</p>
            ) : (
              <div>
                <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-[#233D34]">Wat motiveert jou?</label>
                <textarea id={inputId} value={draft} onChange={(event) => setDraft(event.target.value)}
                  rows={3} maxLength={300} required disabled={pending} placeholder="Bijvoorbeeld: ik wil genoeg energie hebben voor een wandeling met mijn gezin."
                  className="block w-full resize-y rounded-2xl border border-[#D8E2D7] bg-white px-4 py-3 text-base text-[#233D34] focus-visible:outline-[#255F50]"/>
                <p className="mt-1 text-right text-xs text-[#536B60]">{draft.length}/300 tekens</p>
              </div>
            )}
            {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" disabled={pending}
              className="min-h-12 w-full rounded-2xl bg-[#1F5D50] px-4 py-3 text-base font-bold text-white hover:bg-[#17483D] disabled:opacity-50">
              {pending ? "Opslaan…" : "Keuze opslaan"}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
