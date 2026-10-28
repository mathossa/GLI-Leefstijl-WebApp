import type { Metadata } from "next";
import { BookHeart, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { amsterdamMonday } from "@/lib/goals-domain.mjs";
import { amsterdamDate, dateOnly } from "@/lib/reflections-domain.mjs";
import { saveReflection, deleteReflection, createMeeting, updateMeeting, deleteMeeting } from "./actions";

export const metadata: Metadata = { title: "Reflectie" };
const field = "mt-1 block w-full rounded-xl border border-[#b8c9b6] bg-white px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d7657]";
const label = "block text-sm font-medium text-[#31533e]";
const muted = "text-sm leading-relaxed text-muted-foreground";
const dateLabel = (d: Date) => new Intl.DateTimeFormat("nl-NL", {
  timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
}).format(d);
type Reflection = { weekStart: Date; wentWell: string; difficult: string; nextStep: string };
type Meeting = { id: string; meetingDate: Date; title: string; notes: string; actionPoints: string | null };

function ReflectionForm({ week, values }: { week: Date; values?: Reflection }) {
  const id = dateOnly(week);
  const questions = [
    { name: "wentWell", text: "Wat ging goed?", value: values?.wentWell },
    { name: "difficult", text: "Wat was lastig?", value: values?.difficult },
    { name: "nextStep", text: "Wat is je volgende stap?", value: values?.nextStep },
  ];
  return <form action={saveReflection} className="space-y-4">
    <input type="hidden" name="weekStart" value={id}/>
    {questions.map((q) => <div key={q.name}>
      <label className={label} htmlFor={q.name + id}>{q.text}</label>
      <textarea id={q.name + id} className={field} name={q.name} maxLength={1500} rows={3} defaultValue={q.value ?? ""}/>
    </div>)}
    <p className="text-xs text-muted-foreground">Beantwoord minstens één vraag. Niets hoeft perfect.</p>
    <Button type="submit">Reflectie opslaan</Button>
  </form>;
}

function MeetingFields({ item, id }: { item?: Meeting; id: string }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
      <div><label className={label} htmlFor={"date" + id}>Datum</label>
        <input className={field} id={"date" + id} name="meetingDate" type="date" required
          defaultValue={item ? dateOnly(item.meetingDate) : amsterdamDate()}/></div>
      <div><label className={label} htmlFor={"title" + id}>Titel bijeenkomst</label>
        <input className={field} id={"title" + id} name="title" maxLength={120} required defaultValue={item?.title ?? ""}/></div>
    </div>
    <div><label className={label} htmlFor={"notes" + id}>Wat neem je mee?</label>
      <textarea className={field} id={"notes" + id} name="notes" rows={4} maxLength={4000} required defaultValue={item?.notes ?? ""}/></div>
    <div><label className={label} htmlFor={"actions" + id}>Mogelijke actiepunten (optioneel)</label>
      <textarea className={field} id={"actions" + id} name="actionPoints" rows={3} maxLength={2000} defaultValue={item?.actionPoints ?? ""}/></div>
  </>;
}

export default async function ReflectionPage({ searchParams }: { searchParams: Promise<{ melding?: string }> }) {
  const session = await requireSession();
  const userId = session.user.id;
  const week = amsterdamMonday();
  const [reflections, meetings] = await Promise.all([
    prisma.weeklyReflection.findMany({ where: { userId }, orderBy: { weekStart: "desc" }, take: 52 }),
    prisma.meetingNote.findMany({ where: { userId }, orderBy: [{ meetingDate: "desc" }, { createdAt: "desc" }], take: 100 }),
  ]);
  const current = reflections.find((x) => dateOnly(x.weekStart) === dateOnly(week));
  const previous = reflections.filter((x) => dateOnly(x.weekStart) !== dateOnly(week));
  const recorded = new Set(reflections.map((x) => dateOnly(x.weekStart)));
  const missingWeeks = Array.from({ length: 11 }, (_, i) => {
    const d = new Date(week);
    d.setUTCDate(d.getUTCDate() - 7 * (i + 1));
    return d;
  }).filter((d) => !recorded.has(dateOnly(d)));
  const message = (await searchParams).melding;

  return <div className="space-y-7">
    <header><p className="mb-1 text-xs font-semibold uppercase tracking-[.18em] text-[#466e51]">Een moment voor jezelf</p>
      <h1 className="text-3xl font-bold">Reflectie <span aria-hidden="true">✨</span></h1>
      <p className={muted}>Jouw eigen verhaal, zonder oordeel. Alleen jij ziet je notities.</p></header>
    {message === "opgeslagen" && <p role="status" className="rounded-xl bg-[#e6f1e5] p-4 text-sm">Je wijzigingen zijn opgeslagen.</p>}
    {message === "ongeldig" && <p role="alert" className="rounded-xl bg-[#fcf5e5] p-4 text-sm">Controleer de velden en datum.</p>}
    <section aria-labelledby="current-heading">
      <Card><CardContent className="space-y-4">
        <div className="flex items-center gap-2"><BookHeart className="text-[#3f805e]" aria-hidden="true"/>
          <h2 id="current-heading" className="text-xl font-semibold">Week van {dateLabel(week)}</h2></div>
        <ReflectionForm week={week} values={current}/>
      </CardContent></Card>
    </section>
    <section className="space-y-3" aria-labelledby="history-heading">
      <h2 id="history-heading" className="text-xl font-semibold">Eerdere reflecties</h2>
      {previous.length === 0 && <p className={muted}>Je hebt nog geen eerdere reflecties.</p>}
      {previous.map((entry) => <details key={dateOnly(entry.weekStart)} className="rounded-2xl border border-border bg-white p-4">
        <summary className="cursor-pointer font-semibold">Week van {dateLabel(entry.weekStart)}</summary>
        <div className="mt-4 space-y-4">
          <ReflectionForm week={entry.weekStart} values={entry}/>
          <details><summary className="cursor-pointer text-sm text-muted-foreground">Reflectie verwijderen</summary>
            <form action={deleteReflection} className="mt-2"><input type="hidden" name="weekStart" value={dateOnly(entry.weekStart)}/>
              <Button size="sm" type="submit" variant="outline">Definitief verwijderen</Button></form>
          </details>
        </div>
      </details>)}
      {missingWeeks.length > 0 && <details className="rounded-2xl border border-border bg-white p-4">
        <summary className="cursor-pointer font-semibold">Een eerdere week invullen</summary>
        <div className="mt-3 space-y-3">{missingWeeks.map((d) => <details className="rounded-xl bg-[#f3f7f0] p-3" key={dateOnly(d)}>
          <summary className="cursor-pointer text-sm font-semibold">{dateLabel(d)}</summary>
          <div className="mt-3"><ReflectionForm week={d}/></div>
        </details>)}</div>
      </details>}
    </section>
    <section className="space-y-4" aria-labelledby="meetings-heading">
      <div className="flex items-center gap-2"><NotebookPen className="text-[#3f805e]" aria-hidden="true"/>
        <h2 id="meetings-heading" className="text-xl font-semibold">CooL-bijeenkomsten</h2></div>
      <Card><CardContent className="space-y-4">
        <h3 className="font-semibold">Nieuwe bijeenkomstnotitie</h3>
        <form action={createMeeting} className="space-y-4">
          <MeetingFields id="new"/><Button type="submit">Notitie opslaan</Button>
        </form>
      </CardContent></Card>
      {meetings.length === 0 && <p className={muted}>Nog geen bijeenkomstnotities.</p>}
      {meetings.map((item) => <details key={item.id} className="rounded-2xl border border-border bg-white p-4">
        <summary className="cursor-pointer font-semibold">{dateLabel(item.meetingDate)} — {item.title}</summary>
        <div className="mt-3 space-y-4">
          <p className="whitespace-pre-wrap text-sm">{item.notes}</p>
          {item.actionPoints && <p className="whitespace-pre-wrap rounded-xl bg-[#eef5e9] p-3 text-sm"><strong>Actiepunten:</strong> {item.actionPoints}</p>}
          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-semibold">Aanpassen</summary>
            <form action={updateMeeting} className="mt-3 space-y-4"><input type="hidden" name="id" value={item.id}/>
              <MeetingFields item={item} id={item.id}/><Button size="sm" type="submit">Wijzigingen opslaan</Button>
            </form>
          </details>
          <details><summary className="cursor-pointer text-sm text-muted-foreground">Notitie verwijderen</summary>
            <form action={deleteMeeting} className="mt-2"><input type="hidden" name="id" value={item.id}/>
              <Button size="sm" type="submit" variant="outline">Definitief verwijderen</Button>
            </form>
          </details>
        </div>
      </details>)}
      {meetings.length >= 100 && <p className="text-xs text-muted-foreground">De recentste 100 notities worden getoond. Oudere notities staan in de export.</p>}
    </section>
    <p className="text-xs text-muted-foreground">Weekgrenzen zijn maandag t/m zondag, in Nederlandse tijd (Europe/Amsterdam).</p>
  </div>;
}
