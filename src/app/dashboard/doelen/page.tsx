import type { Metadata } from "next";
import { ArrowUpRight, Flag, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { demoGoals } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Mijn doelen" };

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <header><p className="mb-1 text-xs font-semibold uppercase tracking-[.18em] text-[#78927d]">Jouw richting</p><h1 className="text-3xl font-bold tracking-tight">Mijn doelen <span aria-hidden="true">🌱</span></h1><p className="mt-2 text-sm text-muted-foreground">Een groot doel begint met kleine stappen, in jouw tempo.</p></header>
      <div className="rounded-[24px] bg-[#eaf1e5] p-5 text-sm text-[#507259]"><span className="font-semibold">Voorbeeldweergave.</span> Doelen aanmaken, wijzigen en opslaan wordt toegevoegd in <a href="https://github.com/mathossa/GLI-Leefstijl-WebApp/issues/4" className="underline">issue #4</a>.</div>
      <section className="grid gap-4 md:grid-cols-2" aria-label="Voorbeeld van persoonlijke doelen">
        {demoGoals.map((goal) => (
          <Card key={goal.id} className="justify-between">
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between"><span className="flex size-14 items-center justify-center rounded-2xl bg-[#edf4e9] text-3xl">{goal.emoji}</span><Badge variant="secondary">{goal.category}</Badge></div>
              <div><h2 className="text-xl font-semibold tracking-tight">{goal.title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{goal.description}</p></div>
              <div><div className="mb-2 flex justify-between text-xs font-semibold"><span>Voorbeeldvoortgang</span><span>{goal.progress}%</span></div><Progress value={goal.progress} aria-label={`${goal.title} ${goal.progress} procent`}/></div>
              <p className="flex items-center gap-2 text-xs text-[#5b8069]"><Flag size={15}/> Kleine stap: {goal.target}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Target size={18}/> Uiteindelijk kun je hier zelf resultaatdoelen en wekelijkse acties aanmaken. <ArrowUpRight size={15}/></p>
    </div>
  );
}
