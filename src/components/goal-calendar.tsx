"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { addCalendarDays, amsterdamToday, calendarCells, monthFromIso, shiftMonth } from "@/lib/goal-calendar-dates.mjs";

const weekdays = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const headingFormat = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" });
const labelFormat = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const label = (iso: string) => labelFormat.format(new Date(iso + "T00:00:00Z"));

/** A calendar that is only mounted while open, avoiding iOS Safari's native
 * date-picker latency inside fixed, scrollable HTML dialogs. No permanent UI.
 * Desktop keeps the platform date input; form submission still uses ISO dates.
 */
export function GoalCalendar({ title, value, minDate, onSelect, onClose }: {
  title: string;
  value: string;
  minDate?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const today = amsterdamToday();
  // For an end date after a future start, open at the first selectable month.
  const firstDay = minDate && (value || today) < minDate ? minDate : value || today;
  const initial = monthFromIso(firstDay);
  const [month, setMonth] = useState(initial);
  const [focused, setFocused] = useState(firstDay);
  const panel = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLButtonElement>(null);
  const cells = calendarCells(month.year, month.month);
  const heading = headingFormat.format(new Date(Date.UTC(month.year, month.month - 1, 1)));
  const selected = value || today;

  useEffect(() => {
    panel.current?.scrollIntoView({ block: "nearest" });
    dayRef.current?.focus({ preventScroll: true });
  }, [focused, month.year, month.month]);

  function moveMonth(offset: number) {
    const next = shiftMonth(month.year, month.month, offset);
    setMonth(next);
    setFocused(`${next.year}-${String(next.month).padStart(2, "0")}-01`);
  }

  function keyDay(event: React.KeyboardEvent, day: string) {
    const step = ({
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
    } as Record<string, number>)[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = addCalendarDays(day, step);
    if (minDate && next < minDate) return;
    setFocused(next);
    setMonth(monthFromIso(next));
  }

  return (
    <div ref={panel} role="group" aria-label={`Kalender voor ${title}`}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}
      className="mt-3 rounded-2xl border border-[#dce7dc] bg-[#fcfefa] p-3 shadow-sm sm:hidden">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="Vorige maand"
          className="flex size-10 items-center justify-center rounded-xl hover:bg-[#eaf3e6]">
          <ChevronLeft size={19}/>
        </button>
        <span aria-live="polite" className="text-sm font-semibold capitalize text-[#294c38]">{heading}</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => moveMonth(1)} aria-label="Volgende maand"
            className="flex size-10 items-center justify-center rounded-xl hover:bg-[#eaf3e6]">
            <ChevronRight size={19}/>
          </button>
          <button type="button" onClick={onClose} aria-label="Kalender sluiten"
            className="flex size-10 items-center justify-center rounded-xl hover:bg-[#eaf3e6]">
            <X size={18}/>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day) => <span key={day} aria-hidden="true"
          className="py-2 text-center text-xs font-semibold text-[#677c6e]">{day}</span>)}
        {cells.map((cell) => {
          const disabled = Boolean(minDate && cell.iso < minDate);
          const isSelected = value === cell.iso;
          return (
            <button key={cell.iso} ref={cell.iso === focused ? dayRef : undefined}
              type="button" disabled={disabled} aria-label={label(cell.iso)}
              aria-pressed={isSelected} aria-current={cell.iso === today ? "date" : undefined}
              tabIndex={cell.iso === focused ? 0 : -1}
              onKeyDown={(event) => keyDay(event, cell.iso)}
              onClick={() => { onSelect(cell.iso); onClose(); }}
              className={`min-h-10 rounded-lg text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2f7053] disabled:opacity-25 ${isSelected
                ? "bg-[#2e6b52] font-bold text-white"
                : cell.iso === selected ? "bg-[#dceddd] font-semibold" : cell.inMonth
                  ? "text-[#294b37] hover:bg-[#eaf3e6]" : "text-[#9ca99d] hover:bg-[#edf3ed]"}`}>
              {cell.day}
            </button>
          );
        })}
      </div>
      {value && <button type="button" onClick={() => { onSelect(""); onClose(); }}
        className="mt-2 min-h-10 w-full rounded-xl text-sm font-semibold text-[#42694d] hover:bg-[#eef5eb]">
        Datum wissen
      </button>}
    </div>
  );
}
