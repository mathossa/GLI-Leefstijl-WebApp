import type { Metadata } from "next";
import { ArrowUpRight, ChartNoAxesCombined, Heart, Sprout } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoHabits } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Inzichten" };
const sampleWeeks = [38, 52, 47, 63, 69, 73];

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <header><p className="mb-1 text-xs font-semibold uppercase tracking-[.18em] text-[#78927d]">Jouw ontwikkeling</p><h1 className="text-3xl font-bold tracking-tight">Inzichten <span aria-hidden="true">📈</span></h1><p className="mt-2 text-sm text-muted-foreground">Zie hoe kleine stappen samen een patroon vormen.</p></header>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Voortgang in de tijd</h2><p className="text-sm text-muted-foreground">Zes fictieve voorbeeldweken</p></div><ChartNoAxesCombined size={22} className="text-[#568668]"/></div>
          <div className="mt-4 flex h-56 items-end gap-3 border-b border-[#dde7dc] pb-1" role="img" aria-label={`Voorbeeldvoortgang week 1 tot 6: ${sampleWeeks.join(", ")} procent`}>
            {sampleWeeks.map((percentage, idx) => (
              <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={idx}>
                <span className="text-xs font-medium text-[#6c876e]">{percentage}%</span>
                <div className="w-full max-w-14 rounded-t-xl bg-[#92b79d]" style={{height:`${percentage}%`}} aria-hidden="true"/>
                <span className="text-xs text-[#8c9b8c]">W{idx+1}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Sprout size={25} className="text-[#4e8968]"/><h2 className="text-lg font-semibold">Je gewoontes</h2>
          <div className="space-y-5">
            {demoHabits.map((habit)=> <div key={habit.id}><div className="mb-2 flex justify-between gap-2 text-sm"><span>{habit.title}</span><span className="font-semibold text-[#548064]">{habit.done}/{habit.target}</span></div><Progress value={habit.done/habit.target*100} aria-label={`${habit.title}: ${habit.done} van ${habit.target}`}/></div>)}
          </div>
        </Card>
      </div>
      <div className="flex items-start gap-3 rounded-2xl bg-[#e9f1e5] p-5 text-sm text-[#5d785f]"><Heart size={18} className="mt-0.5 shrink-0"/><p>Deze grafieken gebruiken uitsluitend fictieve gegevens. Echte trends en je eigen registraties worden toegevoegd in <a href="https://github.com/mathossa/GLI-Leefstijl-WebApp/issues/5" className="underline">issue #5</a>. <ArrowUpRight size={13} className="inline"/></p></div>
    </div>
  );
}
