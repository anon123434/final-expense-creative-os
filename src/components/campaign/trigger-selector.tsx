"use client";

import { useFormContext } from "react-hook-form";
import { CheckCircle2, XCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggers } from "@/lib/seed/triggers";
import type { TriggerState } from "@/lib/validation/campaign-schema";
import type { CampaignFormValues } from "@/lib/validation/campaign-schema";

const CYCLE: TriggerState[] = ["neutral", "include", "exclude"];

const stateConfig: Record<
  TriggerState,
  { label: string; icon: React.ElementType; className: string }
> = {
  neutral: {
    label: "Neutral",
    icon: Circle,
    className:
      "border-border bg-background text-muted-foreground hover:border-primary/50",
  },
  include: {
    label: "Include",
    icon: CheckCircle2,
    className:
      "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  exclude: {
    label: "Exclude",
    icon: XCircle,
    className:
      "border-destructive bg-destructive/5 text-destructive",
  },
};

export function TriggerSelector() {
  const { watch, setValue } = useFormContext<CampaignFormValues>();
  const triggerValues: Record<string, TriggerState> =
    (watch("triggers") as Record<string, TriggerState> | undefined) ?? {};

  function getState(key: string): TriggerState {
    return triggerValues[key] ?? "neutral";
  }

  function cycleState(key: string) {
    const current = getState(key);
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    setValue("triggers", { ...triggerValues, [key]: next }, { shouldDirty: true });
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {triggers.map((trigger) => {
        const state = getState(trigger.key);
        const { icon: Icon, className } = stateConfig[state];

        return (
          <button
            key={trigger.key}
            type="button"
            onClick={() => cycleState(trigger.key)}
            title={trigger.description}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-all",
              className
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate font-medium">{trigger.label}</span>
          </button>
        );
      })}
    </div>
  );
}
