"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
import { logCompletion, undoLastCompletion } from "@/app/dashboard/doelen/actions";

export function QuickCompletion({ actionId, title, completed, target, canUndo }: {
  actionId: string;
  title: string;
  completed: number;
  target: number;
  canUndo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [count, optimisticChange] = useOptimistic(
    completed,
    (current: number, change: number) => Math.max(0, Math.min(target, current + change)),
  );
  const complete = count >= target;

  function run(kind: "complete" | "undo") {
    if (pending || (kind === "complete" && complete) || (kind === "undo" && !canUndo)) return;
    setError("");
    startTransition(async () => {
      optimisticChange(kind === "complete" ? 1 : -1);
      try {
        const result = kind === "complete"
          ? await logCompletion(actionId)
          : await undoLastCompletion(actionId);
        if (!result.ok) setError(result.reason ?? "De registratie kon niet worden bijgewerkt.");
        else router.refresh();
      } catch {
        setError("De registratie kon niet worden bijgewerkt. Probeer opnieuw.");
      }
    });
  }

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
      <div className="min-w-[90px] flex-1 space-y-2">
        <span className="block text-xs font-medium tabular-nums text-[#255F50]" aria-live="polite">{count} / {target} deze week</span>
        <div role="progressbar" aria-label={`Voortgang ${title}`} aria-valuemin={0}
          aria-valuemax={target} aria-valuenow={count}
          className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAF0E9]">
          <div className="brand-progress h-full rounded-full transition-[width] duration-200"
            style={{ width: `${(count / target) * 100}%` }}/>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={() => run("undo")} disabled={pending || !canUndo}
          aria-label={`Laatste registratie van ${title} ongedaan maken`} title="Laatste ongedaan maken"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#D8E2D7] bg-[#EAF0E9] text-[#255F50] transition-colors hover:bg-[#EAF0E9] disabled:cursor-not-allowed disabled:opacity-40 sm:size-12">
          <RotateCcw size={21} aria-hidden="true"/>
        </button>
        <button type="button" onClick={() => run("complete")} disabled={pending || complete}
          aria-label={`Markeer ${title} als gedaan`} title="Gedaan"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_5px_12px_-8px_rgba(25,75,50,.65)] transition-colors hover:bg-[#17483D] disabled:cursor-not-allowed disabled:bg-[#EAF0E9] disabled:text-[#233D34] sm:size-12">
          <Check size={23} strokeWidth={2.5} aria-hidden="true"/>
        </button>
      </div>
      {error && <p role="alert" className="w-full text-xs text-red-700">{error}</p>}
    </div>
  );
}
