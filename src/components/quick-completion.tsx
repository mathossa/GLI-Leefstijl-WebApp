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
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => run("complete")} disabled={pending || complete}
          aria-label={`Markeer ${title} als gedaan`} title="Gedaan"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#2c7155] text-white shadow-[0_5px_12px_-8px_rgba(25,75,50,.65)] transition-colors hover:bg-[#22583f] disabled:cursor-not-allowed disabled:bg-[#e5eee4] disabled:text-[#336b4e] sm:size-13">
          <Check size={23} strokeWidth={2.5} aria-hidden="true"/>
        </button>
        <button type="button" onClick={() => run("undo")} disabled={pending || !canUndo}
          aria-label={`Laatste registratie van ${title} ongedaan maken`} title="Laatste ongedaan maken"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#dfe6da] bg-white text-[#456658] shadow-sm transition-colors hover:bg-[#f0f5ee] disabled:cursor-not-allowed disabled:opacity-40 sm:size-13">
          <RotateCcw size={20} aria-hidden="true"/>
        </button>
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-[#456a52]" aria-live="polite">{count} / {target} deze week</span>
      {error && <p role="alert" className="max-w-44 text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}
