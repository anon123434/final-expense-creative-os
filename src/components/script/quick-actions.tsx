"use client";

import {
  RefreshCw,
  Zap,
  Heart,
  ShieldCheck,
  Scissors,
  AlignJustify,
  Expand,
} from "lucide-react";
import type { ScriptTransform } from "@/lib/services/script-transforms";
import { TRANSFORM_LABELS } from "@/lib/services/script-transforms";
import { cn } from "@/lib/utils";

const TRANSFORM_ICONS: Record<ScriptTransform, React.ElementType> = {
  regenerate: RefreshCw,
  more_urgent: Zap,
  more_emotional: Heart,
  more_authority: ShieldCheck,
  simplify: Scissors,
  shorter: AlignJustify,
  longer: Expand,
};

const TRANSFORM_ORDER: ScriptTransform[] = [
  "regenerate",
  "more_urgent",
  "more_emotional",
  "more_authority",
  "simplify",
  "shorter",
  "longer",
];

interface QuickActionsProps {
  onTransform: (transform: ScriptTransform) => void;
  loading: boolean;
  activeTransform: ScriptTransform | null;
}

export function QuickActions({ onTransform, loading, activeTransform }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TRANSFORM_ORDER.map((key) => {
        const Icon = TRANSFORM_ICONS[key];
        const isActive = activeTransform === key && loading;
        return (
          <button
            key={key}
            type="button"
            disabled={loading}
            onClick={() => onTransform(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
              "transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isActive && "border-primary bg-primary/10 text-primary"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", isActive && "animate-spin")} />
            {TRANSFORM_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}
