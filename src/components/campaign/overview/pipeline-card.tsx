"use client";

import Link from "next/link";
import {
  UserCircle,
  Lightbulb,
  FileText,
  Mic,
  Film,
  Sparkles,
  GitBranch,
  Clapperboard,
  Check,
  Lock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "./pipeline-grid";

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  UserCircle,
  Lightbulb,
  FileText,
  Mic,
  Film,
  Sparkles,
  GitBranch,
  Clapperboard,
};

export function PipelineCard({ stage, index }: { stage: PipelineStage; index: number }) {
  const Icon = ICONS[stage.iconName] ?? Zap;
  const isCompleted = stage.status === "completed";
  const isActive = stage.status === "active";
  const isLocked = stage.status === "locked";

  return (
    <Link
      href={isLocked ? "#" : stage.href}
      aria-disabled={isLocked}
      tabIndex={isLocked ? -1 : undefined}
      className={cn(
        "pipeline-card group relative flex flex-col gap-3 overflow-hidden rounded-xl border p-4 transition-all duration-300",
        isCompleted &&
          "border-[#00E676]/20 bg-[#0d0d0d] hover:border-[#00E676]/45 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,230,118,0.07)]",
        isActive &&
          "border-white/12 bg-[#0d0d0d] hover:border-cyan-400/40 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,180,255,0.07)]",
        isLocked && "border-white/5 bg-[#0a0a0a] opacity-40 pointer-events-none select-none",
      )}
      style={{ animationDelay: `${index * 55 + 350}ms` }}
    >
      {/* Completed left accent bar */}
      {isCompleted && (
        <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-[#00E676]/70" />
      )}
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-cyan-400/50" />
      )}

      {/* Subtle inner glow on completed */}
      {isCompleted && (
        <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(0,230,118,0.04), transparent)" }}
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-300",
          isCompleted && "border-[#00E676]/25 bg-[#00E676]/8 text-[#00E676]",
          isActive && "border-cyan-400/25 bg-cyan-400/8 text-cyan-400",
          isLocked && "border-white/8 bg-white/4 text-white/20",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className="flex-1 space-y-0.5">
        <p
          className={cn(
            "font-display text-sm font-semibold leading-tight tracking-wide",
            isLocked ? "text-foreground/25" : "text-foreground",
          )}
        >
          {stage.title}
        </p>
        <p
          className={cn(
            "text-[11px] leading-snug",
            isLocked ? "text-muted-foreground/25" : "text-muted-foreground",
          )}
        >
          {stage.description}
        </p>
      </div>

      {/* Status badge */}
      {isCompleted && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#00E676]/10 px-2 py-0.5 font-mono-data text-[9px] uppercase tracking-widest text-[#00E676]">
          <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
          Done
        </span>
      )}
      {isActive && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-cyan-400/10 px-2 py-0.5 font-mono-data text-[9px] uppercase tracking-widest text-cyan-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          Active
        </span>
      )}
      {isLocked && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/4 px-2 py-0.5 font-mono-data text-[9px] uppercase tracking-widest text-white/20">
          <Lock className="h-2.5 w-2.5" />
          Locked
        </span>
      )}
    </Link>
  );
}
