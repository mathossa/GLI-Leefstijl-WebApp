"use client";

import { useState } from "react";
import { ChartNoAxesCombined, ChevronRight, Download, Heart, Sprout } from "lucide-react";
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
  const rows = period === "weeks" ? weeks : months;

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#213d2e]">Inzichten</h1>
        <p className="text-sm text-[#667a69]">Wat je zelf hebt vastgelegd, op een rij.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="Overzicht">
        <Card className="min-w-0 rounded-[22px] p-4 sm:p-5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8f3e5] text-[#367b54]" aria-hidden="true"><Sprout size={21}/></span>
          <strong className="text-2xl font-bold tabular-nums text-[#234a35]">{registeredWeeks}<span className="text-sm font-medium text-[#697d6e]"> / 12</span></strong>
          <p className="text-xs leading-snug text-[#587062]">Weken met activiteiten</p>
        </Card>
        <Card className="min-w-0 rounded-[22px] p-4 sm:p-5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#f0e9f7] text-[#84689f]" aria-hidden="true"><Heart size={21}/></span>
          <strong className="text-2xl font-bold tabular-nums text-[#234a35]">{reflectionCount}</strong>
          <p className="text-xs leading-snug text-[#587062]">Weekreflecties</p>
        </Card>
      </section>

      <section className="space-y-4 rounded-[24px] border border-[#e1e9e0] bg-white p-4 sm:p-6" aria-labelledby="trends-title">
        <div className="flex items-center gap-2">
          <ChartNoAxesCombined size={22} className="text-[#367b54]" aria-hidden="true"/>
          <h2 id="trends-title" className="text-xl font-bold text-[#274737]">Jouw voortgang</h2>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#eff4ed] p-1" role="group" aria-label="Periode">
          <button type="button" onClick={() => setPeriod("weeks")} aria-pressed={period === "weeks"}
            className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${period === "weeks" ? "bg-white text-[#285f40] shadow-sm" : "text-[#607768]"}`}>
            Per week
          </button>
          <button type="button" onClick={() => setPeriod("months")} aria-pressed={period === "months"}
            className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${period === "months" ? "bg-white text-[#285f40] shadow-sm" : "text-[#607768]"}`}>
            Per maand
          </button>
        </div>
        <div className="space-y-2.5" aria-live="polite">
          {rows.map((item) => (
            <div key={item.label} className="space-y-2 rounded-2xl border border-[#e8ede6] bg-[#fffefc] px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 text-sm font-semibold text-[#314d39]">{item.label}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#3a7152]">
                  {item.percentage === null ? "Geen gegevens" : `${item.percentage}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e8eee6]"
                role="progressbar" aria-label={`Voortgang ${item.label}`}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percentage ?? undefined}
                aria-valuetext={item.percentage === null ? "Geen registratie" : `${item.completed} van ${item.target} uitgevoerde weekacties`}>
                {item.percentage !== null && <div className="h-full rounded-full bg-[#397d58]" style={{width: `${item.percentage}%`}}/>}
              </div>
              {item.percentage !== null && <p className="text-xs text-[#6b7c6b]">{item.completed} van {item.target} geplande stappen</p>}
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-[#6a7b6c]">Geen registratie is geen 0%. Je voortgang is gebaseerd op je eigen ingevoerde weekacties.</p>
      </section>

      <section className="space-y-3 rounded-[24px] border border-[#dce7d8] bg-[#edf4e9] p-5">
        <h2 className="font-bold text-[#254736]">Mijn gegevens exporteren</h2>
        <p className="text-sm text-[#607468]">Download jouw doelen, acties, individuele ervaringen, reflecties en CooL-notities als JSON.</p>
        <a href="/api/export/pdf" download className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2f7353] px-4 text-sm font-semibold text-white hover:bg-[#285e46]">
          <Download size={18} aria-hidden="true"/> PDF-overzicht voor delen <ChevronRight size={16} aria-hidden="true"/>
        </a>
        <a href="/api/export" download className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#a3bea8] bg-white px-4 text-sm font-semibold text-[#2f7353] hover:bg-[#f7faf4]">
          <Download size={18} aria-hidden="true"/> Volledige JSON-export <ChevronRight size={16} aria-hidden="true"/>
        </a>
        <p className="text-xs text-[#6a7b6c]">De PDF is een deelbaar overzicht zonder privéfoto’s. De JSON bevat je volledige historie. Bewaar beide veilig.</p>
      </section>
    </div>
  );
}
