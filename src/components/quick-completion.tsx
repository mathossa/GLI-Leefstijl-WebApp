"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logCompletion, undoLastCompletion } from "@/app/dashboard/doelen/actions";

// No form, dialogue or mandatory note: a single tap logs one occurrence.
export function QuickCompletion({ actionId, title, completed, target, canUndo }: {
  actionId: string; title: string; completed: number; target: number; canUndo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [count, optimisticAdd] = useOptimistic(completed, (current, increment: number) => Math.max(0, Math.min(target, current + increment)));
  const reached = count >= target;

  function complete() {
    if (pending || reached) return;
    setError("");
    startTransition(async () => {
      optimisticAdd(1);
      try {
        const outcome = await logCompletion(actionId);
        if (!outcome.ok) {
          setError(outcome.reason ?? "Registreren is niet gelukt.");
        } else {
          router.refresh();
        }
      } catch {
        setError("Registreren is niet gelukt. Probeer het opnieuw.");
      }
    });
  }

  function undo() {
    if (pending || !canUndo) return;
    setError("");
    startTransition(async () => {
      optimisticAdd(-1);
      try {
        const outcome = await undoLastCompletion(actionId);
        if (!outcome.ok) {
          setError(outcome.reason ?? "Ongedaan maken is niet gelukt.");
        } else {
          router.refresh();
        }
      } catch {
        setError("Ongedaan maken is niet gelukt.");
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <Button type="button" onClick={complete} disabled={pending || reached}
        className="min-h-11 min-w-28 px-4" aria-label={`Registreer één keer: ${title}`}>
        {reached ? <><Check aria-hidden="true"/> Weekdoel gehaald</> :
          <><Plus aria-hidden="true"/> {pending ? "Bezig…" : "Gedaan"}</>}
      </Button>
      <span className="text-xs font-semibold tabular-nums text-[#42674f]" aria-live="polite">{count} / {target} deze week</span>
      {canUndo && <button type="button" onClick={undo} disabled={pending}
        className="text-xs text-[#42674f] underline underline-offset-2 disabled:opacity-50"
        aria-label={`Laatste registratie van ${title} ongedaan maken`}>Laatste ongedaan maken</button>}
      {error && <span className="max-w-48 text-right text-xs text-red-700" role="alert">{error}</span>}
    </div>
  );
}
