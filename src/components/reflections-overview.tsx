"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, BookHeart, CalendarDays, ChevronLeft, ChevronRight, ClipboardPenLine, Plus, ImagePlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveReflection, deleteReflection, createMeeting, updateMeeting, deleteMeeting, uploadMeetingPhoto, deleteMeetingPhoto } from "@/app/dashboard/reflectie/actions";

export type ReflectionView = {
  weekStart: string;
  wentWell: string;
  difficult: string;
  nextStep: string;
};
export type MeetingView = {
  id: string;
  meetingDate: string;
  title: string;
  notes: string;
  actionPoints: string | null;
  photos: { id: string; fileName: string }[];
};
type Mode =
  | { kind: "reflection"; weekStart: string }
  | { kind: "meeting-new" }
  | { kind: "meeting"; id: string }
  | { kind: "meeting-edit"; id: string };

const field = "mt-1.5 block w-full min-w-0 rounded-xl border border-[#cfdecf] bg-white px-3.5 py-3 text-sm text-[#263e30]";
const label = "block text-sm font-semibold text-[#345343]";
const formattedDate = (value: string) => new Intl.DateTimeFormat("nl-NL", {
  timeZone: "UTC", day: "numeric", month: "long", year: "numeric",
}).format(new Date(value + "T00:00:00Z"));
function summary(value: string, limit = 115) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? clean.slice(0, limit - 1) + "…" : clean;
}

export function ReflectionsOverview({ currentWeek, reflections, meetings, message }: {
  currentWeek: string; reflections: ReflectionView[]; meetings: MeetingView[]; message: string | null;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const weekStrip = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const thisWeek = reflections.find((item) => item.weekStart === currentWeek);
  const recorded = new Set(reflections.map((item) => item.weekStart));
  const weeks = Array.from({ length: 52 }, (_, i) => {
    const d = new Date(currentWeek + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - i * 7);
    return d.toISOString().slice(0, 10);
  });

  function open(next: Mode) {
    setMode(next);
    if (!modal.current?.open) modal.current?.showModal();
    else modal.current.scrollTop = 0;
  }
  function close() {
    modal.current?.close();
    setMode(null);
  }
  function back() {
    if (mode?.kind === "meeting-edit") open({ kind: "meeting", id: mode.id });
    else close();
  }
  const entry = mode?.kind === "reflection" ?
    reflections.find((item) => item.weekStart === mode.weekStart) : null;
  const meeting = mode && "id" in mode ?
    meetings.find((item) => item.id === mode.id) : null;
  const title = mode?.kind === "reflection" ? "Weekreflectie" :
    mode?.kind === "meeting-new" ? "Nieuwe bijeenkomst" :
    mode?.kind === "meeting-edit" ? "Bijeenkomst bewerken" : "Bijeenkomst";
  const showBack = mode?.kind === "meeting-edit";

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#213e30]">Reflectie</h1>
        <p className="text-sm text-[#647869]">Jouw momenten en inzichten op één plek.</p>
      </header>
      {message === "opgeslagen" && <p role="status" className="rounded-xl bg-[#e8f3e5] p-3 text-sm text-[#2a6042]">Wijzigingen opgeslagen.</p>}
      {message === "ongeldig" && <p role="alert" className="rounded-xl border border-[#e2c99b] bg-[#fff5e4] p-3 text-sm text-[#815d31]">Controleer de invoer of datum.</p>}

      <section className="space-y-3" aria-labelledby="this-reflection">
        <h2 id="this-reflection" className="flex items-center gap-2 text-lg font-bold text-[#274836]">
          <BookHeart size={21} aria-hidden="true"/> Deze week
        </h2>
        <button type="button" onClick={() => open({kind:"reflection",weekStart:currentWeek})}
          className="flex min-h-25 w-full items-center gap-4 rounded-[23px] border border-[#e0e8dd] bg-white p-4 text-left shadow-[0_7px_24px_-22px_rgba(36,70,49,.4)] hover:border-[#b2d1b7] sm:p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2e5] text-[#37704e]"><BookHeart size={23} aria-hidden="true"/></span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-[#2d4e3a]">{thisWeek ? "Mijn weekreflectie" : "Even stilstaan"}</span>
            <span className="mt-1 block text-xs text-[#607567]">Week van {formattedDate(currentWeek)}</span>
            {thisWeek && <span className="mt-1.5 block truncate text-sm text-[#69776c]">{summary(thisWeek.wentWell || thisWeek.difficult || thisWeek.nextStep)}</span>}
          </span>
          <ChevronRight size={20} className="shrink-0 text-[#6e8975]" aria-hidden="true"/>
        </button>
      </section>

      <section aria-labelledby="week-selection" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="week-selection" className="text-lg font-bold text-[#274836]">Andere weken</h2>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Verder terug in de weken"
              onClick={() => weekStrip.current?.scrollBy({ left: 264, behavior: "smooth" })}
              className="flex size-10 items-center justify-center rounded-xl bg-[#eaf2e8] text-[#2f6246]">
              <ChevronRight size={19} aria-hidden="true"/>
            </button>
            <button type="button" aria-label="Terug naar recente weken"
              onClick={() => weekStrip.current?.scrollBy({ left: -264, behavior: "smooth" })}
              className="flex size-10 items-center justify-center rounded-xl bg-[#eaf2e8] text-[#2f6246]">
              <ChevronLeft size={19} aria-hidden="true"/>
            </button>
          </div>
        </div>
        <div ref={weekStrip} className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2"
          role="group" aria-label="Kies een eerdere week">
          {weeks.slice(1).map((week) => (
            <button type="button" key={week} onClick={() => open({ kind: "reflection", weekStart: week })}
              className="flex min-h-20 min-w-28 shrink-0 snap-start flex-col justify-between gap-2 rounded-2xl border border-[#dce8db] bg-white px-3 py-3 text-left transition-colors hover:bg-[#eaf4e9] focus-visible:outline-[#2e7651]"
              aria-label={`Reflectie van week ${formattedDate(week)}`}>
              <span className="text-xs font-semibold text-[#345741]">{new Intl.DateTimeFormat("nl-NL", {
                day: "numeric", month: "short", timeZone: "UTC",
              }).format(new Date(week + "T00:00:00Z"))}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#667a6c]">
                <span className={`size-2 rounded-full ${recorded.has(week) ? "bg-[#3c9265]" : "bg-[#d2ded3]"}`} aria-hidden="true"/>
                {recorded.has(week) ? "Ingevuld" : "Leeg"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="meeting-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="meeting-heading" className="flex items-center gap-2 text-lg font-bold text-[#274836]">
            <ClipboardPenLine size={20} aria-hidden="true"/> CooL-bijeenkomsten
          </h2>
          <button type="button" onClick={() => open({kind:"meeting-new"})} aria-label="Nieuwe bijeenkomst toevoegen"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e7f2e5] text-[#286648]">
            <Plus size={21} aria-hidden="true"/>
          </button>
        </div>
        {meetings.length === 0 && <p className="text-sm text-[#657769]">Nog geen bijeenkomstnotities.</p>}
        <div className="space-y-2.5">
          {meetings.map((item) => (
            <button type="button" key={item.id} onClick={() => open({kind:"meeting",id:item.id})}
              className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-[#e4eae1] bg-white px-4 py-3.5 text-left">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e9f1e7] text-[#3c7655]"><CalendarDays size={18} aria-hidden="true"/></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[#294535]">{item.title}</span>
                <span className="mt-0.5 block text-xs text-[#657969]">{formattedDate(item.meetingDate)}</span>
                <span className="mt-1 block truncate text-xs text-[#657969]">{summary(item.notes)}</span>
              </span>
              <ChevronRight size={19} aria-hidden="true"/>
            </button>
          ))}
        </div>
      </section>

      <dialog ref={modal} aria-label={title} onClose={() => setMode(null)}
        onClick={(event) => { if (event.currentTarget === event.target) close(); }}
        className="review-dialog">
        <div aria-hidden="true" className="mx-auto mb-3 mt-3 h-1.5 w-12 rounded-full bg-[#dce5db] sm:hidden"/>
        <div className="space-y-5 px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-2 sm:px-7 sm:pb-7 sm:pt-7">
          <header className="flex items-start gap-3">
            {showBack && <button type="button" onClick={back} aria-label="Terug" className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#426a51]"><ArrowLeft size={20}/></button>}
            <h2 className="min-w-0 flex-1 break-words pt-1 text-xl font-bold text-[#203d2e]">{title}</h2>
            <button type="button" onClick={close} aria-label="Sluiten" className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#526f5b]"><X size={21}/></button>
          </header>

          {mode?.kind === "reflection" && (
            <form key={mode.weekStart} action={saveReflection} className="space-y-4">
              <p className="text-sm text-[#5e7866]">Week van {formattedDate(mode.weekStart)}</p>
              <input name="weekStart" type="hidden" value={mode.weekStart}/>
              {([
                ["wentWell", "Wat ging goed?", entry?.wentWell],
                ["difficult", "Wat was lastig?", entry?.difficult],
                ["nextStep", "Wat is je volgende stap?", entry?.nextStep],
              ] as const).map(([fieldName, prompt, value]) => (
                <div key={fieldName}>
                  <label className={label} htmlFor={fieldName}>{prompt}</label>
                  <textarea id={fieldName} name={fieldName} maxLength={1500} rows={3} className={field} defaultValue={value ?? ""}/>
                </div>
              ))}
              <Button className="h-12 w-full" type="submit">Reflectie opslaan</Button>
            </form>
          )}
          {mode?.kind === "reflection" && entry && (
            <form action={deleteReflection} className="border-t border-[#e2e9df] pt-3"
              onSubmit={(event) => { if (!window.confirm("Deze weekreflectie verwijderen?")) event.preventDefault(); }}>
              <input type="hidden" name="weekStart" value={entry.weekStart}/>
              <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm text-[#b04545]">
                <Trash2 size={17} aria-hidden="true"/> Reflectie verwijderen
              </button>
            </form>
          )}

          {mode?.kind === "meeting-new" && (
            <form action={createMeeting} className="space-y-4">
              <MeetingFields/>
              <Button type="submit" className="h-12 w-full">Bijeenkomst opslaan</Button>
            </form>
          )}

          {mode?.kind === "meeting" && meeting && (
            <div className="space-y-5">
              <p className="text-sm text-[#5f7665]">{formattedDate(meeting.meetingDate)}</p>
              {meeting.notes && <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#304b3a]">{meeting.notes}</p>}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-[#2b523a]">Foto’s van je aantekeningen ({meeting.photos.length}/5)</h3>
                {meeting.photos.length > 0 && (
                  <ul className="grid grid-cols-2 gap-3">
                    {meeting.photos.map((photo) => (
                      <li key={photo.id} className="overflow-hidden rounded-2xl border border-[#dfe8df] bg-white">
                        <a href={`/api/meeting-photos/${photo.id}`} target="_blank" rel="noopener noreferrer"
                          aria-label={`Bekijk ${photo.fileName}`} className="block">
                          <Image src={`/api/meeting-photos/${photo.id}`} alt={photo.fileName}
                            width={256} height={256} unoptimized
                            className="h-32 w-full object-contain bg-[#f5f7f3]"/>
                        </a>
                        <form action={deleteMeetingPhoto} onSubmit={(event) => {
                          if (!window.confirm("Deze foto verwijderen?")) event.preventDefault();
                        }} className="p-2">
                          <input type="hidden" name="id" value={photo.id}/>
                          <button type="submit" className="min-h-10 w-full rounded-xl border border-[#e7d8d4] text-xs font-semibold text-[#a53f3e]">
                            <Trash2 size={14} className="mr-1 inline" aria-hidden="true"/> Verwijderen
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                {meeting.photos.length < 5 && (
                  <form action={uploadMeetingPhoto} className="space-y-2 rounded-2xl bg-[#edf5e9] p-4">
                    <input type="hidden" name="id" value={meeting.id}/>
                    <label htmlFor="meeting-new-photo" className="flex items-center gap-2 text-sm font-semibold text-[#315e42]">
                      <ImagePlus size={19} aria-hidden="true"/> Foto toevoegen
                    </label>
                    <input id="meeting-new-photo" type="file" name="photo" required
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      className="block w-full min-w-0 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-[#305a42]"/>
                    <p className="text-xs text-[#5c7464]">Maximaal 8 MB per foto. Alle foto's zijn privé.</p>
                    <Button type="submit" size="sm" className="w-full">Foto bewaren</Button>
                  </form>
                )}
              </section>
              {meeting.actionPoints && <div className="rounded-xl bg-[#eaf2e6] p-4">
                <h3 className="mb-1 text-sm font-semibold">Actiepunten</h3>
                <p className="whitespace-pre-wrap text-sm text-[#43634c]">{meeting.actionPoints}</p>
              </div>}
              <button type="button" onClick={() => open({kind:"meeting-edit",id:meeting.id})}
                className="flex min-h-12 w-full items-center justify-center rounded-xl border border-[#d6e5d5] bg-[#f0f6ec] text-sm font-semibold text-[#2f6d4d]">
                Bijeenkomst bewerken
              </button>
              <form action={deleteMeeting} onSubmit={(e) => { if (!window.confirm("Deze bijeenkomstnotitie verwijderen?")) e.preventDefault(); }}>
                <input type="hidden" name="id" value={meeting.id}/>
                <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f2d6d1] bg-[#fff6f5] text-sm font-semibold text-[#ad3e3e]">
                  <Trash2 size={17} aria-hidden="true"/> Notitie verwijderen
                </button>
              </form>
            </div>
          )}

          {mode?.kind === "meeting-edit" && meeting && (
            <form action={updateMeeting} className="space-y-4">
              <input type="hidden" name="id" value={meeting.id}/>
              <MeetingFields meeting={meeting}/>
              <Button className="h-12 w-full" type="submit">Wijzigingen opslaan</Button>
            </form>
          )}
        </div>
      </dialog>

    </div>
  );
}

function MeetingFields({ meeting }: { meeting?: MeetingView }) {
  const prefix = meeting?.id ?? "new";
  const now = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (name: string) => now.find((v) => v.type === name)?.value;
  const today = [part("year"),part("month"),part("day")].join("-");
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`meeting-date-${prefix}`} className={label}>Datum</label>
          <input type="date" id={`meeting-date-${prefix}`} name="meetingDate" required className={field}
            defaultValue={meeting?.meetingDate ?? today}/>
        </div>
        <div>
          <label htmlFor={`meeting-title-${prefix}`} className={label}>Titel bijeenkomst</label>
          <input id={`meeting-title-${prefix}`} name="title" maxLength={120} required className={field}
            defaultValue={meeting?.title ?? ""} placeholder="Bijvoorbeeld: CooL bijeenkomst 3"/>
        </div>
      </div>
      <div>
        <label htmlFor={`meeting-notes-${prefix}`} className={label}>Wat neem je mee? <span className="font-normal text-[#657a6a]">(optioneel)</span></label>
        <textarea id={`meeting-notes-${prefix}`} name="notes" rows={4} maxLength={4000} className={field}
          defaultValue={meeting?.notes ?? ""}/>
      </div>
      <div>
        <label htmlFor={`meeting-actions-${prefix}`} className={label}>Actiepunten <span className="font-normal text-[#687d6e]">(optioneel)</span></label>
        <textarea id={`meeting-actions-${prefix}`} name="actionPoints" rows={3} maxLength={2000} className={field}
          defaultValue={meeting?.actionPoints ?? ""}/>
      <div>
        <label htmlFor={`meeting-photo-${prefix}`} className={label}>Foto van je schrift of papier <span className="font-normal text-[#657a6a]">(optioneel)</span></label>
        <input id={`meeting-photo-${prefix}`} type="file" name="photo"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="mt-2 block w-full min-w-0 text-sm file:mr-2 file:rounded-xl file:border-0 file:bg-[#edf4ea] file:px-3 file:py-2 file:text-[#28583d]"/>
        <p className="mt-1 text-xs text-[#647669]">Geen tekst overtypen nodig. Maximaal 8 MB per foto.</p>
      </div>
      </div>
    </>
  );
}
