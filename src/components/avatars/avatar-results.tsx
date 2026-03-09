"use client";

import { RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Avatar, AvatarMode } from "@/types/avatar";

interface AvatarResultsProps {
  generating: boolean;
  mode: AvatarMode;
  generatedAvatar: Avatar | null;
  error: string | null;
  pendingName: string;
  onPendingNameChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  usedMock?: boolean;
}

const LIKENESS_LABELS = ["Front", "3/4 Angle", "Side Profile", "Relaxed Pose"];
const ENVIRONMENT_LABELS = ["Scene 1", "Scene 2", "Scene 3", "Scene 4"];

export function AvatarResults({
  generating, mode, generatedAvatar, error,
  pendingName, onPendingNameChange, onSave, saving, usedMock,
}: AvatarResultsProps) {
  const labels = mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;
  const imageUrls = generatedAvatar?.imageUrls ?? [];
  const hasResults = imageUrls.length > 0;
  const isEmpty = !generating && !hasResults && !error;

  return (
    <div className="flex flex-col gap-5">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mock warning */}
      {usedMock && !generating && (
        <div className="rounded-md border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-600 dark:text-amber-400 flex items-start gap-2">
          <span className="text-amber-500 shrink-0">⚠</span>
          <span>
            <strong>No Gemini API key found</strong> — images above are placeholders.{" "}
            Go to <strong>Settings</strong> and add your Gemini API key to generate real images.
          </span>
        </div>
      )}

      {/* Image grid */}
      {(generating || hasResults) && (
        <div className="grid grid-cols-2 gap-3">
          {labels.map((label, i) => (
            <div key={i} className="space-y-1.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {label}
              </p>
              <div
                className={cn(
                  "relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted",
                  generating && !imageUrls[i] && "animate-pulse"
                )}
              >
                {imageUrls[i] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrls[i]}
                    alt={label}
                    className="h-full w-full object-cover transition-opacity duration-500"
                  />
                )}
                {generating && !imageUrls[i] && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="h-2 w-2 rounded-full animate-bounce"
                      style={{ background: "var(--primary)" }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <RotateCcw className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No avatar generated yet</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Configure your settings on the left and click Generate Avatar.
          </p>
        </div>
      )}

      {/* Save section */}
      {hasResults && !generating && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Save Avatar
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={pendingName}
              onChange={(e) => onPendingNameChange(e.target.value)}
              placeholder="Avatar name…"
              className="flex-1 h-9 rounded border border-border bg-input text-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/40 transition-colors"
            />
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !pendingName.trim()}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
