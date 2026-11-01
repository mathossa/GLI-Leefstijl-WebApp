"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileDown, FileUp, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { confirmAdminQuoteImport, previewAdminQuoteImport, saveAdminQuote, setAdminQuoteState } from "@/app/admin/quotes/actions";
import { MAX_QUOTE_FILE_BYTES } from "@/lib/admin-quote-domain.mjs";

type Quote = {
  id: string; text: string; category: string | null; isActive: boolean;
  origin: string; deleted: boolean; updatedAt: string;
};
type Counts = { active: number; inactive: number; deleted: number };
type Preview = Awaited<ReturnType<typeof previewAdminQuoteImport>>;
const inputClass = "w-full rounded-xl border border-[#D8E2D7] bg-white px-3.5 py-3 text-base text-[#233D34]";
const mainButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1F5D50] px-4 py-2 text-sm font-bold text-white hover:bg-[#17483D] disabled:opacity-50";
const subtleButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#D8E2D7] bg-white px-3 py-2 text-sm font-semibold text-[#255F50] hover:bg-[#EAF0E9] disabled:opacity-50";

export function AdminQuotesManager({ initialQuotes, counts }: { initialQuotes: Quote[]; counts: Counts }) {
  const router = useRouter();
  const modal = useRef<HTMLDialogElement>(null);
  const headingId = useId(), textId = useId(), categoryId = useId();
  const [editing, setEditing] = useState<Quote | null>(null);
  const [draft, setDraft] = useState({ text: "", category: "", isActive: true });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"active"|"inactive"|"deleted"|"all">("active");
  const [limit, setLimit] = useState(40);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importSource, setImportSource] = useState<{ content: string; format: "csv"|"json" } | null>(null);
  const [readingFile, setReadingFile] = useState(false);

  const visible = initialQuotes.filter(quote => {
    const eligible = filter === "all" || (filter === "deleted" ? quote.deleted : filter === "active" ? !quote.deleted && quote.isActive : !quote.deleted && !quote.isActive);
    const match = (quote.text + " " + (quote.category ?? "") + " " + quote.id).toLocaleLowerCase("nl-NL").includes(search.trim().toLocaleLowerCase("nl-NL"));
    return eligible && match;
  });

  function openQuote(quote: Quote | null) {
    setEditing(quote);
    setDraft({ text: quote?.text ?? "", category: quote?.category ?? "", isActive: quote?.isActive ?? true });
    setError("");
    modal.current?.showModal();
  }
  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await saveAdminQuote({ id: editing?.id, ...draft });
        if (!result.ok) { setError(result.message); return; }
        modal.current?.close();
        setNotice(result.message);
        router.refresh();
      } catch { setError("Opslaan lukte niet. Probeer opnieuw."); }
    });
  }

  function stateChange(quote: Quote, intent: "enable"|"disable"|"delete"|"restore") {
    if (pending) return;
    if (intent === "delete" && !window.confirm("Deze quote verwijderen? Je kunt hem later herstellen.")) return;
    setError(""); setNotice("");
    startTransition(async () => {
      try {
        const result = await setAdminQuoteState(quote.id, intent);
        if (!result.ok) setError(result.message);
        else { setNotice(result.message); router.refresh(); }
      } catch { setError("Wijziging mislukt. Probeer opnieuw."); }
    });
  }

  async function selectImport(file?: File) {
    setPreview(null); setImportSource(null); setError(""); setNotice("");
    if (!file) return;
    const suffix = file.name.toLowerCase().split(".").at(-1);
    if (suffix !== "csv" && suffix !== "json") { setError("Kies een .csv- of .json-bestand."); return; }
    if (file.size > MAX_QUOTE_FILE_BYTES) { setError("Bestand is groter dan 128 KB."); return; }
    setReadingFile(true);
    try {
      const content = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const source = { content, format: suffix };
      const result = await previewAdminQuoteImport(source.content, source.format);
      setPreview(result);
      if (result.ok) setImportSource(source);
      else setError(result.message);
    } catch {
      setError("Bestand kon niet als UTF-8 worden gelezen.");
    } finally { setReadingFile(false); }
  }

  function importConfirmed() {
    if (!preview?.ok || !preview.hash || !importSource || pending || preview.counts?.error) return;
    setError(""); setNotice("");
    startTransition(async () => {
      try {
        const result = await confirmAdminQuoteImport(importSource.content, importSource.format, preview.hash!);
        if (!result.ok) { setError(result.message); setPreview(null); return; }
        setNotice(result.message); setImportSource(null); setPreview(null);
        router.refresh();
      } catch { setError("Importeren lukte niet. Probeer opnieuw."); setPreview(null); }
    });
  }

  return (
    <div className="space-y-5">
      <section aria-label="Aantal quotes" className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          ["Actief", counts.active],
          ["Inactief", counts.inactive],
          ["Verwijderd", counts.deleted],
        ].map(([label,value]) => (
          <div key={label} className="rounded-2xl border border-[#D8E2D7] bg-white px-3 py-4 sm:px-5">
            <strong className="block text-2xl font-bold tabular-nums text-[#233D34]">{value}</strong>
            <span className="text-xs font-medium text-[#536B60]">{label}</span>
          </div>
        ))}
      </section>
      {(notice || error) && (
        <p role={error ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-800" : "bg-[#EAF0E9] text-[#233D34]"}`}>
          {error || notice}
        </p>
      )}
      <section className="space-y-4 rounded-3xl border border-[#D8E2D7] bg-[#FFFDFA] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#233D34]">Bibliotheek</h2>
            <p className="text-sm text-[#536B60]">Zoek, bewerk en bepaal welke teksten dagelijks kunnen verschijnen.</p>
          </div>
          <button type="button" className={mainButton} onClick={() => openQuote(null)} disabled={pending}>
            <Plus size={18} aria-hidden="true"/> Quote toevoegen
          </button>
        </div>
        <div className="relative">
          <Search size={19} className="pointer-events-none absolute left-3 top-3.5 text-[#536B60]" aria-hidden="true"/>
          <input type="search" aria-label="Zoek in de quote-bibliotheek" placeholder="Zoeken op tekst of categorie"
            value={search} onChange={event => { setSearch(event.target.value); setLimit(40); }}
            className={inputClass + " pl-10"}/>
        </div>
        <div role="group" aria-label="Filter op status" className="flex flex-wrap gap-2">
          {([["active","Actief"],["inactive","Inactief"],["deleted","Verwijderd"],["all","Alles"]] as const).map(([value,label]) => (
            <button key={value} type="button" aria-pressed={filter===value}
              onClick={() => { setFilter(value); setLimit(40); }}
              className={`min-h-10 rounded-xl border px-3 py-2 text-sm font-semibold ${filter===value ? "border-[#255F50] bg-[#EAF0E9] text-[#233D34]" : "border-[#D8E2D7] bg-white text-[#536B60]"}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs font-medium text-[#536B60]">{visible.length} quotes gevonden</p>
        <ul className="space-y-2">
          {visible.slice(0,limit).map(quote => (
            <li key={quote.id} className="min-w-0 rounded-2xl border border-[#D8E2D7] bg-white p-3.5 sm:p-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="break-words text-sm font-semibold leading-relaxed text-[#233D34]">{quote.text}</p>
                  <p className="text-xs text-[#536B60]">{quote.category || "Zonder categorie"} · {quote.origin === "SEED" ? "Startset" : "Toegevoegd"} · {quote.deleted ? "Verwijderd" : quote.isActive ? "Actief" : "Inactief"}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quote.deleted ? (
                    <button type="button" className={subtleButton} disabled={pending} onClick={() => stateChange(quote,"restore")}>
                      <RotateCcw size={16} aria-hidden="true"/> Herstel
                    </button>
                  ) : (
                    <>
                      <button type="button" className={subtleButton} disabled={pending} onClick={() => openQuote(quote)}
                        aria-label={`Bewerk quote: ${quote.text}`}><Pencil size={16} aria-hidden="true"/> Bewerk</button>
                      <button type="button" className={subtleButton} disabled={pending}
                        onClick={() => stateChange(quote, quote.isActive ? "disable" : "enable")}>
                        {quote.isActive ? "Deactiveer" : "Activeer"}
                      </button>
                      <button type="button" className={subtleButton} disabled={pending}
                        aria-label={`Verwijder quote: ${quote.text}`} onClick={() => stateChange(quote,"delete")}>
                        <Trash2 size={16} aria-hidden="true"/> Verwijder
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {!visible.length && <p className="rounded-xl bg-[#EAF0E9] p-4 text-sm text-[#536B60]">Geen quotes gevonden.</p>}
        {visible.length > limit && <button type="button" className={subtleButton} onClick={() => setLimit(value => value+40)}>Meer tonen</button>}
      </section>
      <section className="space-y-4 rounded-3xl border border-[#D8E2D7] bg-[#FFFDFA] p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-bold text-[#233D34]">Importeren en exporteren</h2>
          <p className="text-sm text-[#536B60]">Gebruik CSV of JSON. Importeren toont eerst een controleoverzicht; geen gedeeltelijke imports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={subtleButton} href="/api/admin/quotes/export?format=json">
            <FileDown size={17} aria-hidden="true"/> Exporteer JSON
          </a>
          <a className={subtleButton} href="/api/admin/quotes/export?format=csv">
            <FileDown size={17} aria-hidden="true"/> Exporteer CSV
          </a>
        </div>
        <label className="block space-y-2 text-sm font-semibold text-[#233D34]">
          <span className="inline-flex items-center gap-2"><FileUp size={18} aria-hidden="true"/> Importeer bestand (max. 128 KB / 250 quotes)</span>
          <input type="file" accept=".csv,.json,text/csv,application/json" disabled={readingFile || pending}
            onChange={event => { void selectImport(event.target.files?.[0]); event.target.value = ""; }}
            className="block w-full rounded-xl border border-[#D8E2D7] bg-white p-3 text-base font-normal text-[#233D34] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EAF0E9] file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#255F50]"/>
        </label>
        {readingFile && <p role="status" className="text-sm text-[#536B60]">Bestand wordt gecontroleerd…</p>}
        {preview?.ok && preview.counts && (
          <div className="space-y-3 rounded-2xl bg-[#EAF0E9] p-4">
            <h3 className="font-bold text-[#233D34]">Controle vóór import</h3>
            <p role="status" className="text-sm text-[#536B60]">{preview.message}</p>
            <p className="text-sm font-semibold text-[#233D34]">
              {preview.counts.create} nieuw · {preview.counts.update} bijgewerkt · {preview.counts.skip} overgeslagen · {preview.counts.error} ongeldig
            </p>
            <div className="max-h-60 overflow-y-auto rounded-xl bg-white p-3">
              <ul className="space-y-2 text-xs">
                {preview.rows?.slice(0,50).map(row => (
                  <li key={row.line} className="border-b border-[#D8E2D7] pb-2 last:border-0">
                    <span className="font-bold">Regel {row.line} · {row.operation}</span> — {row.reason}
                    {row.text && <p className="mt-1 break-words text-[#536B60]">{row.text}</p>}
                  </li>
                ))}
              </ul>
              {(preview.rows?.length ?? 0) > 50 && <p className="mt-2 text-xs text-[#536B60]">De eerste 50 regels worden getoond.</p>}
            </div>
            <button type="button" className={mainButton}
              disabled={pending || !!preview.counts.error || !preview.counts.create && !preview.counts.update}
              onClick={importConfirmed}>{pending ? "Importeren…" : "Import bevestigen"}</button>
          </div>
        )}
      </section>
      <dialog ref={modal} aria-labelledby={headingId} className="review-dialog"
        onClick={event => { if (event.target === event.currentTarget && !pending) modal.current?.close(); }}>
        <div className="mx-auto mb-4 mt-3 h-1.5 w-12 rounded-full bg-[#EAF0E9] sm:hidden" aria-hidden="true"/>
        <div className="space-y-4 px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-2 sm:px-7 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <h2 id={headingId} className="text-xl font-bold text-[#233D34]">{editing ? "Quote bewerken" : "Quote toevoegen"}</h2>
            <button type="button" className="flex size-10 items-center justify-center rounded-xl text-[#255F50] hover:bg-[#EAF0E9]"
              aria-label="Sluiten" onClick={() => modal.current?.close()} disabled={pending}><X size={21}/></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor={textId} className="block text-sm font-bold">Motivatietekst</label>
              <textarea id={textId} rows={4} maxLength={300} required disabled={pending} className={inputClass}
                value={draft.text} onChange={event => setDraft(v => ({...v,text:event.target.value}))}
                placeholder="Bijvoorbeeld: een gewone dinsdag is ook een goed moment om te beginnen."/>
              <p className="text-right text-xs text-[#536B60]">{draft.text.length}/300</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={categoryId} className="block text-sm font-bold">Categorie (optioneel)</label>
              <input id={categoryId} value={draft.category} onChange={event => setDraft(v => ({...v,category:event.target.value}))}
                maxLength={30} disabled={pending} className={inputClass} placeholder="Bijvoorbeeld: BEWEGEN"/>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[#233D34]">
              <input type="checkbox" checked={draft.isActive} onChange={event => setDraft(v => ({...v,isActive:event.target.checked}))}
                disabled={pending} className="size-5 accent-[#1F5D50]"/>
              Direct actief (vanaf volgende dag)
            </label>
            {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
            <button type="submit" disabled={pending} className={mainButton + " w-full"}>
              {pending ? "Opslaan…" : editing ? "Wijzigingen opslaan" : "Quote toevoegen"}
            </button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
