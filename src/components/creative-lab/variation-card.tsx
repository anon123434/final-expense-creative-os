"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown, ChevronUp, Tag, Sparkles, Eye, BookmarkPlus,
  FileText, CheckCircle2, AlertCircle, Copy, Check,
} from "lucide-react";
import type { CreativeVariation } from "@/types/variation";
import { saveVariationAsConceptAction, generateScriptFromVariationAction } from "@/app/actions/variations";
import { cn } from "@/lib/utils";

interface VariationCardProps {
  variation: CreativeVariation;
  selected?: boolean;
  onSelect?: () => void;
  onSavedAsConcept?: (variation: CreativeVariation) => void;
  onScriptGenerated?: (variation: CreativeVariation, conceptId: string) => void;
}

export function VariationCard({
  variation,
  selected = false,
  onSelect,
  onSavedAsConcept,
  onScriptGenerated,
}: VariationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [savedAsConcept, setSavedAsConcept] = useState(false);
  const [scriptGenerated, setScriptGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHook, setCopiedHook] = useState(false);

  const [savingConcept, startSavingConcept] = useTransition();
  const [generatingScript, startGeneratingScript] = useTransition();

  function handleSaveAsConcept() {
    setError(null);
    startSavingConcept(async () => {
      const result = await saveVariationAsConceptAction(variation);
      if (result.success) {
        setSavedAsConcept(true);
        onSavedAsConcept?.(variation);
      } else {
        setError(result.error);
      }
    });
  }

  function handleGenerateScript() {
    setError(null);
    startGeneratingScript(async () => {
      const result = await generateScriptFromVariationAction(variation);
      if (result.success) {
        setScriptGenerated(true);
        onScriptGenerated?.(variation, result.data.conceptId);
      } else {
        setError(result.error);
      }
    });
  }

  async function handleCopyHook() {
    await navigator.clipboard.writeText(variation.hook);
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2000);
  }

  const activeTriggers = Object.entries(variation.triggerStack)
    .filter(([, active]) => active)
    .map(([key]) => key);

  return (
    <div
      className={cn(
        "rounded-lg border bg-background transition-all",
        selected
          ? "border-primary ring-2 ring-primary/20 shadow-sm"
          : "hover:border-border/80",
        expanded && !selected && "shadow-sm"
      )}
    >
      {/* Clickable header for selection */}
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left px-4 pt-4 pb-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-t-lg"
        aria-pressed={selected}
      >
        {/* Number + title row */}
        <div className="flex items-start gap-3">
          <span className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
            selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}>
            {variation.variationNumber}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{variation.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{variation.emotionalTone}</p>
          </div>
          {/* Expand toggle — stop propagation so it doesn't toggle selection */}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setExpanded((v) => !v); } }}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>

      {/* Card body — not part of the selection button */}
      <div className="px-4 pb-4 pt-3 space-y-3">
        {/* Hook */}
        <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-xs leading-relaxed relative group">
          <p className="pr-8">{variation.hook}</p>
          <button
            type="button"
            onClick={handleCopyHook}
            title="Copy hook"
            className="absolute right-2 top-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
          >
            {copiedHook ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Active triggers */}
        {activeTriggers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeTriggers.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
              >
                <Tag className="h-2.5 w-2.5" />
                {key}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
              "hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            {expanded ? "Hide Details" : "View Details"}
          </button>

          {savedAsConcept ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved as Concept
            </span>
          ) : (
            <button
              type="button"
              disabled={savingConcept}
              onClick={handleSaveAsConcept}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
                "hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <BookmarkPlus className={cn("h-3.5 w-3.5", savingConcept && "animate-pulse")} />
              {savingConcept ? "Saving…" : "Save as Concept"}
            </button>
          )}

          {scriptGenerated ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Script Created
            </span>
          ) : (
            <button
              type="button"
              disabled={generatingScript}
              onClick={handleGenerateScript}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground",
                "hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <FileText className={cn("h-3.5 w-3.5", generatingScript && "animate-pulse")} />
              {generatingScript ? "Generating…" : "Generate Script"}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4 text-sm">
          {/* What changed */}
          <DetailSection title="What Changed">
            <ul className="space-y-1">
              {variation.whatChanged.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />
                  {item}
                </li>
              ))}
            </ul>
          </DetailSection>

          {/* Scene summary */}
          <DetailSection title="Scene Summary">
            <ol className="space-y-1">
              {variation.sceneSummary.map((scene, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 shrink-0 font-medium text-muted-foreground w-4">{i + 1}.</span>
                  {scene}
                </li>
              ))}
            </ol>
          </DetailSection>

          {/* Image prompt examples */}
          {variation.imagePromptExamples.length > 0 && (
            <DetailSection title="Image Prompt Examples">
              {variation.imagePromptExamples.map((prompt, i) => (
                <CopyablePrompt key={i} label={`Scene ${i + 1}`} text={prompt} color="violet" />
              ))}
            </DetailSection>
          )}

          {/* Kling prompt examples */}
          {variation.klingPromptExamples.length > 0 && (
            <DetailSection title="Kling 3.0 Prompt Examples">
              {variation.klingPromptExamples.map((prompt, i) => (
                <CopyablePrompt key={i} label={`Scene ${i + 1}`} text={prompt} color="sky" />
              ))}
            </DetailSection>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function CopyablePrompt({
  label,
  text,
  color,
}: {
  label: string;
  text: string;
  color: "violet" | "sky";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const headerClasses =
    color === "violet"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <div className="rounded-md border overflow-hidden">
      <div className={cn("flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b", headerClasses)}>
        <span>{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="opacity-70 hover:opacity-100 transition-opacity"
          title="Copy prompt"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <p className="px-2.5 py-2 text-[11px] leading-relaxed font-mono text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
