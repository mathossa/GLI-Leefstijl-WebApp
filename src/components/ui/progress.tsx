"use client";
// Adapted from shadcn/ui (MIT): https://github.com/shadcn-ui/ui
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

function Progress({ className, value = 0, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const safeValue = Math.max(0, Math.min(100, value ?? 0));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={safeValue}
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-primary/12", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full rounded-full bg-primary transition-transform"
        style={{ transform: `translateX(-${100 - safeValue}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
