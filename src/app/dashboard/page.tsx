import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronRight, CircleCheck, Leaf, Sparkles, Sun, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoHabits } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Vandaag" };
const completed = demoHabits.reduce((sum, h) => sum + h.done, 0);
const planned = demoHabits.reduce((sum, h) => sum + h.target, 0);
const overall = Math.round(completed / planned * 100);

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.18em] text-[#79917c]">Mijn overzicht</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Goed dat je er bent <span aria-hidden="true">☀️</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">Elke kleine stap brengt je dichter bij wat belangrijk voor je is.</p>
        </div>
        <Badge variant="outline" className="gap-2 bg-white/80 py-2"><CalendarDays size={14} /> Voorbeeldweek</Badge>
      </div>

      <section className="wellness-pattern relative overflow-hidden rounded-[28px] border border-[#e5ecdc] px-6 py-7 sm:px-9 sm:py-9" aria-labelledby="welcome-title">
        <div className="relative z-10 max-w-[67%] space-y-3 sm:max-w-[75%]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#557e60]"><Sparkles size={15}/> Jouw groei telt</span>
          <h2 id="welcome-title" className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Goed bezig met jouw <span className="text-[#448966]">gezonde gewoontes!</span></h2>
          <p className="max-w-sm text-sm leading-relaxed text-[#687f69]">Niet perfect, wel vooruit. Focus op wat vandaag mogelijk is.</p>
          <Button asChild size="sm" className="mt-2"><Link href="/dashboard/doelen">Bekijk mijn doelen <ArrowRight size={16}/></Link></Button>
        </div>
        <div className="pointer-events-none absolute -bottom-6 -right-7 flex size-44 items-center justify-center rounded-full bg-[#cfe6ce]/70 sm:-bottom-8 sm:right-12 sm:size-56">
          <div className="flex size-32 rotate-[-15deg] items-center justify-center rounded-full bg-[#e4eee0] sm:size-40"><Leaf size={94} strokeWidth={1} className="text-[#679b76] sm:size-28" /></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Overzicht van de week">
        <Card className="flex-row items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#e7f3e6] text-[#4e9671]"><Target size={22}/></span>
          <div><p className="text-2xl font-bold">{demoHabits.length}</p><p className="text-xs text-muted-foreground">Actieve gewoontes</p></div>
        </Card>
        <Card className="flex-row items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff3d8] text-[#c99b4e]"><CircleCheck size={22}/></span>
          <div><p className="text-2xl font-bold">{completed} <span className="text-sm text-[#96a597]">/ {planned}</span></p><p className="text-xs text-muted-foreground">Stappen deze week</p></div>
        </Card>
        <Card className="flex-row items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8e5f5] text-[#8d81b3]"><TrendingUp size={22}/></span>
          <div><p className="text-2xl font-bold">{overall}%</p><p className="text-xs text-muted-foreground">Van je weekdoelen</p></div>
        </Card>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section aria-labelledby="habits-heading">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle id="habits-heading" className="text-xl">Mijn gewoontes</CardTitle><p className="mt-1 text-sm text-muted-foreground">Dit wil je deze week oefenen</p></div>
              <Link href="/dashboard/doelen" className="flex items-center gap-1 text-sm font-semibold text-[#3f805e] hover:underline">Bekijk alles <ChevronRight size={16}/></Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {demoHabits.map((habit) => (
                <div key={habit.id} className="flex items-center gap-3 rounded-2xl border border-[#e9ede4] bg-[#fffefb] p-3 sm:p-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: habit.color }}>{habit.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{habit.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{habit.detail}</p>
                    <Progress value={habit.done / habit.target * 100} className="mt-2 h-1.5" aria-label={`${habit.title}: ${habit.done} van ${habit.target} uitgevoerd`}/>
                  </div>
                  <span className="whitespace-nowrap text-xs font-semibold text-[#558365]">{habit.done}/{habit.target}</span>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">Dit zijn fictieve voorbeelden. Registreren en opslaan volgt in issue #4.</p>
            </CardContent>
          </Card>
        </section>
        <section aria-labelledby="reflection-heading">
          <Card className="h-full justify-between bg-[#f2f5ee]">
            <CardHeader>
              <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-[#e0ebde] text-[#528564]"><Sun size={21}/></span>
              <CardTitle id="reflection-heading" className="text-xl">Even stilstaan</CardTitle>
              <p className="text-sm leading-relaxed text-[#70806e]">Een moment voor jezelf. Hoe voel je je en waar ben je trots op?</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-white/75 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#95a095]">Vraag van de week</p>
                <p className="mt-2 font-medium leading-relaxed">Wat ging deze week beter dan je vooraf dacht?</p>
              </div>
              <Button variant="outline" asChild className="w-full bg-white"><Link href="/dashboard/reflectie">Bekijk reflectie <ArrowRight size={16}/></Link></Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-[#ecf2e9] px-5 py-4 text-sm text-[#567362]"><Check size={17} className="shrink-0"/><span>Je hoeft niet alles in één keer te veranderen. Eén haalbare stap is genoeg om te beginnen.</span></div>
      <footer className="flex items-center justify-center gap-2 pb-3 text-xs text-[#879488]"><Leaf size={14}/> Mijn Leefstijl · AGPL-3.0 · <a className="underline" href="https://github.com/mathossa/GLI-Leefstijl-WebApp" rel="noopener noreferrer" target="_blank">Broncode</a></footer>
    </div>
  );
}
