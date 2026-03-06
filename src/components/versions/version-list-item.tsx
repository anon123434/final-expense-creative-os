"use client";

import { useState, useTransition } from "react";
import {
  Clock, Lightbulb, FileText, Mic, Film, Layers,
  RotateCcw, Copy, Check, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import type { CampaignVersion } from "@/types/version";
import { summarizeSnapshot } from "@/lib/utils/snapshot-utils";
import { restoreVersionAction } from "@/app/actions/versions";
import { cn } from "@/lib/utils";

interface VersionListItemProps {
  version: CampaignVersion;
  onRestored: (versionId: string, restoredItems: string[]) => void;
}

export function VersionListItem({ version, onRestored }: VersionListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string[] | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoring, startRestore] = useTransition();
  const [copied, setCopied] = useState(false);

  const summary = summarizeSnapshot(version.snapshot);
  const savedAt = new Date(version.createdAt);

  function handleRestore() {
    if (!confirmRestore) {
      setConfirmRestore(true);
      return;
    }
    setConfirmRestore(false);
    setRestoreError(null);
    startRestore(async () => {
      const result = await restoreVersionAction(version.campaignId, version.id);
      if (result.success) {
        setRestoreResult(result.result.restoredItems);
        onRestored(version.id, result.result.restoredItems);
      } else {
        setRestoreError(result.error);
      }
    });
  }

  async function handleCopyJson() {
    await navigator.clipboard.writeText(
      JSON.stringify(version.snapshot, null, 2)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn(
      "rounded-lg border bg-background transition-shadow",
      expanded && "shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-start gap-4 px-4 py-4">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Main info */}
        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{version.name}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <time dateTime={version.createdAt}>
              {savedAt.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              at{" "}
              {savedAt.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {summary.conceptTitle && (
              <SummaryChip icon={Lightbulb} label={summary.conceptTitle} color="violet" />
            )}
            {summary.scriptHook && (
              <SummaryChip
                icon={FileText}
                label={`Script — "${summary.scriptHook.slice(0, 40)}${summary.scriptHook.length > 40 ? "…" : ""}"`}
                color="default"
              />
            )}
            {summary.sceneCount > 0 && (
              <SummaryChip icon={Film} label={`${summary.sceneCount} scenes`} color="amber" />
            )}
            {summary.hasVoScript && (
              <SummaryChip icon={Mic} label="VO Script" color="blue" />
            )}
            {summary.hasPromptPack && (
              <SummaryChip icon={Layers} label="Prompt Pack" color="sky" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Copy JSON */}
          <button
            type="button"
            onClick={handleCopyJson}
            title="Copy snapshot JSON"
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
              "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              copied && "border-emerald-400 text-emerald-600"
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "JSON"}
          </button>

          {/* Restore */}
          {restoreResult ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Restored
            </span>
          ) : confirmRestore ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Restore?</span>
              <button
                type="button"
                disabled={restoring}
                onClick={handleRestore}
                className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              >
                {restoring ? "Restoring…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRestore(false)}
                className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={restoring}
              onClick={handleRestore}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
                "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <RotateCcw className={cn("h-3.5 w-3.5", restoring && "animate-spin")} />
              Restore
            </button>
          )}
        </div>
      </div>

      {/* Restore error */}
      {restoreError && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {restoreError}
        </div>
      )}

      {/* Restore success detail */}
      {restoreResult && (
        <div className="mx-4 mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <span className="font-medium">Restored: </span>
          {restoreResult.join(", ")}. New rows created — check the Script, ElevenLabs, Visual Plan, and Prompts tabs.
        </div>
      )}

      {/* Expanded snapshot preview */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          <SnapshotPreview snapshot={version.snapshot} />
        </div>
      )}
    </div>
  );
}

// ── Snapshot preview ───────────────────────────────────────────────────────

function SnapshotPreview({ snapshot }: { snapshot: CampaignVersion["snapshot"] }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Campaign */}
      <PreviewSection title="Campaign">
        <PreviewRow label="Title" value={snapshot.campaign?.title} />
        <PreviewRow label="Offer" value={snapshot.campaign?.offerName} />
        <PreviewRow label="Phone" value={snapshot.campaign?.phoneNumber} />
        <PreviewRow label="Duration" value={snapshot.campaign?.durationSeconds ? `${snapshot.campaign.durationSeconds}s` : null} />
        {snapshot.triggers && snapshot.triggers.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="w-28 shrink-0 text-xs text-muted-foreground">Triggers</span>
            <div className="flex flex-wrap gap-1">
              {snapshot.triggers
                .filter((t) => t.included)
                .map((t) => (
                  <span key={t.triggerKey} className="rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                    {t.triggerKey}
                  </span>
                ))}
            </div>
          </div>
        )}
      </PreviewSection>

      {/* Concept */}
      {snapshot.selectedConcept && (
        <PreviewSection title="Selected Concept">
          <PreviewRow label="Title" value={snapshot.selectedConcept.title} />
          <PreviewRow label="Angle" value={snapshot.selectedConcept.oneSentenceAngle} />
        </PreviewSection>
      )}

      {/* Script */}
      {snapshot.script && (
        <PreviewSection title="Script">
          <PreviewRow label="Version" value={snapshot.script.versionName} />
          {snapshot.script.hook && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Hook</span>
              <p className="rounded-md border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed">
                {snapshot.script.hook}
              </p>
            </div>
          )}
        </PreviewSection>
      )}

      {/* Visual plan scenes */}
      {snapshot.visualPlan?.sceneBreakdown && snapshot.visualPlan.sceneBreakdown.length > 0 && (
        <PreviewSection title={`Visual Plan — ${snapshot.visualPlan.sceneBreakdown.length} scenes`}>
          <div className="flex flex-wrap gap-1.5">
            {snapshot.visualPlan.sceneBreakdown.map((scene) => (
              <span
                key={scene.sceneNumber}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-medium",
                  scene.sceneType === "A-roll"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}
              >
                {scene.sceneNumber}. {scene.sceneType}
              </span>
            ))}
          </div>
        </PreviewSection>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-xs">{value}</span>
    </div>
  );
}

type ChipColor = "violet" | "amber" | "blue" | "sky" | "default";

function SummaryChip({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ElementType;
  label: string;
  color: ChipColor;
}) {
  const classes: Record<ChipColor, string> = {
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    default: "border-border bg-muted/40 text-muted-foreground",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
      classes[color]
    )}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
