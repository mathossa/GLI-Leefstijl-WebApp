"use client";

import { useState } from "react";
import { ChartNoAxesCombined, ChevronRight, Download, Heart, LoaderCircle, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

export type TrendPoint = {
  label: string;
  completed: number;
  target: number;
  percentage: number | null;
};

export function InsightsOverview({ weeks, months, reflectionCount, registeredWeeks }: {
  weeks: TrendPoint[];
  months: TrendPoint[];
  reflectionCount: number;
  registeredWeeks: number;
}) {
  const [period, setPeriod] = useState<"weeks" | "months">("weeks");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [showPdfBrowserFallback, setShowPdfBrowserFallback] = useState(false);
  const rows = period === "weeks" ? weeks : months;

  async function exportPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    setPdfError("");
    setShowPdfBrowserFallback(false);

    try {
      // Fetch as a file rather than navigating the standalone PWA to a PDF.
      // iOS can otherwise leave the user in a native PDF screen without a
      // visible close/back control.
      const response = await fetch("/api/export/pdf", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
        throw new Error("PDF request failed");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("Empty PDF");
      const filename = "mijn-leefstijl-overzicht.pdf";
      const file = new File([blob], filename, { type: "application/pdf" });
      const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
      const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      // The native sharing sheet allows 'Save to Files', AirDrop and sharing
      // without leaving the app. Only called after a deliberate user tap.
      if (isTouchDevice && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
        let canShare = false;
        try { canShare = navigator.canShare({ files: [file] }); } catch { /* unsupported file */ }
        if (canShare) {
          try {
            await navigator.share({ files: [file], title: "Mijn Leefstijl" });
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            // If the share-sheet lost user activation while building the PDF,
            // offer a new browser tab on iOS rather than trapping the PWA.
          }
        }
      }

      if (isAppleMobile) {
        setPdfError("Delen of bewaren via het systeemmenu is niet beschikbaar. Open de PDF in een apart browsertabblad.");
        setShowPdfBrowserFallback(true);
        return;
      }

      // On browsers that support programmatic downloads, keep the current
      // page mounted instead of replacing it with the document viewer.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setPdfError("De PDF kon niet worden klaargemaakt. Probeer het opnieuw.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#233D34]">Inzichten</h1>
        <p className="text-sm text-[#255F50]">Wat je zelf hebt vastgelegd, op een rij.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="Overzicht">
        <Card className="min-w-0 rounded-[22px] p-4 sm:p-5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#EAF0E9] text-[#255F50]" aria-hidden="true"><TrendingUp size={21}/></span>
          <strong className="text-2xl font-bold tabular-nums text-[#233D34]">{registeredWeeks}<span className="text-sm font-medium text-[#255F50]"> / 12</span></strong>
          <p className="text-xs leading-snug text-[#255F50]">Weken met activiteiten</p>
        </Card>
        <Card className="min-w-0 rounded-[22px] p-4 sm:p-5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#EAF0E9] text-[#84689f]" aria-hidden="true"><Heart size={21}/></span>
          <strong className="text-2xl font-bold tabular-nums text-[#233D34]">{reflectionCount}</strong>
          <p className="text-xs leading-snug text-[#255F50]">Weekreflecties</p>
        </Card>
      </section>

      <section className="space-y-4 rounded-[24px] border border-[#D8E2D7] bg-white p-4 sm:p-6" aria-labelledby="trends-title">
        <div className="flex items-center gap-2">
          <ChartNoAxesCombined size={22} className="text-[#255F50]" aria-hidden="true"/>
          <h2 id="trends-title" className="text-xl font-bold text-[#233D34]">Jouw voortgang</h2>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#EAF0E9] p-1" role="group" aria-label="Periode">
          <button type="button" onClick={() => setPeriod("weeks")} aria-pressed={period === "weeks"}
            className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${period === "weeks" ? "bg-white text-[#233D34] shadow-sm" : "text-[#255F50]"}`}>
            Per week
          </button>
          <button type="button" onClick={() => setPeriod("months")} aria-pressed={period === "months"}
            className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${period === "months" ? "bg-white text-[#233D34] shadow-sm" : "text-[#255F50]"}`}>
            Per maand
          </button>
        </div>
        <div className="space-y-2.5" aria-live="polite">
          {rows.map((item) => (
            <div key={item.label} className="space-y-2 rounded-2xl border border-[#D8E2D7] bg-[#EAF0E9] px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 text-sm font-semibold text-[#233D34]">{item.label}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#233D34]">
                  {item.percentage === null ? "Geen gegevens" : `${item.percentage}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EAF0E9]"
                role="progressbar" aria-label={`Voortgang ${item.label}`}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percentage ?? undefined}
                aria-valuetext={item.percentage === null ? "Geen registratie" : `${item.completed} van ${item.target} uitgevoerde weekacties`}>
                {item.percentage !== null && <div className="brand-progress h-full rounded-full" style={{width: `${item.percentage}%`}}/>}
              </div>
              {item.percentage !== null && <p className="text-xs text-[#255F50]">{item.completed} van {item.target} geplande stappen</p>}
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-[#255F50]">Geen registratie is geen 0%. Je voortgang is gebaseerd op je eigen ingevoerde weekacties.</p>
      </section>

      <section className="space-y-3 rounded-[24px] border border-[#D8E2D7] bg-[#EAF0E9] p-5">
        <h2 className="font-bold text-[#233D34]">Mijn gegevens exporteren</h2>
        <p className="text-sm text-[#255F50]">Bewaar of deel een PDF-overzicht, of download je volledige gegevens als JSON.</p>
        <button type="button" onClick={exportPdf} disabled={pdfBusy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1F5D50] px-4 text-sm font-semibold text-white hover:bg-[#17483D] disabled:cursor-wait disabled:opacity-70">
          {pdfBusy ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true"/> : <Download size={18} aria-hidden="true"/>}
          {pdfBusy ? "PDF voorbereiden..." : "PDF bewaren of delen"}
          {!pdfBusy && <ChevronRight size={16} aria-hidden="true"/>}
        </button>
        {pdfError && <p role="alert" className="text-sm text-[#8B3324]">{pdfError}</p>}
        {showPdfBrowserFallback && (
          <a href="/api/export/pdf" target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 text-[#1F5D50]">
            Open PDF in apart browservenster
          </a>
        )}
        <a href="/api/export" download className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D8E2D7] bg-white px-4 text-sm font-semibold text-[#233D34] hover:bg-[#EAF0E9]">
          <Download size={18} aria-hidden="true"/> Volledige JSON-export <ChevronRight size={16} aria-hidden="true"/>
        </a>
        <p className="text-xs text-[#255F50]">De PDF is een deelbaar overzicht zonder privéfoto’s. De JSON bevat je volledige historie. Bewaar beide veilig.</p>
      </section>
    </div>
  );
}
