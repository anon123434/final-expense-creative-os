"use client";

import { useState, useTransition, useMemo } from "react";
import {
  FlaskConical, Sparkles, AlertCircle, RefreshCw,
  BookmarkPlus, FileText, CheckCircle2, X, SlidersHorizontal, Tag,
} from "lucide-react";
import type { CreativeVariation } from "@/types/variation";
import { VariationCard } from "./variation-card";
import {
  generateVariationsAction,
  saveVariationAsConceptAction,
  generateScriptFromVariationAction,
} from "@/app/actions/variations";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "@/components/ui/provider-badge";

interface CreativeLabPanelProps {
  campaignId: string;
  initialVariations: CreativeVariation[];
}

export function CreativeLabPanel({ campaignId, initialVariations }: CreativeLabPanelProps) {
  const [variations, setVariations] = useState<CreativeVariation[]>(initialVariations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTone, setFilterTone] = useState<string | null>(null);
  const [filterTrigger, setFilterTrigger] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Panel-level action state for the selected variation
  const [panelSaved, setPanelSaved] = useState<string | null>(null); // stores id of saved variation
  const [panelScripted, setPanelScripted] = useState<string | null>(null);
  const [panelActionError, setPanelActionError] = useState<string | null>(null);
  const [savingConcept, startSavingConcept] = useTransition();
  const [generatingScript, startGeneratingScript] = useTransition();
  const [generating, startGenerating] = useTransition();

  // Derived filter options
  const uniqueTones = useMemo(() => {
    const tones = variations.map((v) => v.emotionalTone).filter(Boolean);
    return [...new Set(tones)];
  }, [variations]);

  const uniqueTriggers = useMemo(() => {
    const keys = new Set<string>();
    for (const v of variations) {
      Object.entries(v.triggerStack)
        .filter(([, active]) => active)
        .forEach(([key]) => keys.add(key));
    }
    return [...keys].sort();
  }, [variations]);

  // Filtered view
  const filteredVariations = useMemo(() => {
    return variations.filter((v) => {
      if (filterTone && v.emotionalTone !== filterTone) return false;
      if (filterTrigger && !v.triggerStack[filterTrigger]) return false;
      return true;
    });
  }, [variations, filterTone, filterTrigger]);

  const selectedVariation = variations.find((v) => v.id === selectedId) ?? null;
  const filtersActive = filterTone !== null || filterTrigger !== null;

  function handleGenerate() {
    setError(null);
    setSelectedId(null);
    setFilterTone(null);
    setFilterTrigger(null);
    setPanelSaved(null);
    setPanelScripted(null);
    startGenerating(async () => {
      const result = await generateVariationsAction(campaignId);
      if (result.success) {
        setVariations(result.data);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
    setPanelSaved(null);
    setPanelScripted(null);
    setPanelActionError(null);
  }

  function handleClearFilters() {
    setFilterTone(null);
    setFilterTrigger(null);
  }

  function handlePanelSaveAsConcept() {
    if (!selectedVariation) return;
    setPanelActionError(null);
    startSavingConcept(async () => {
      const result = await saveVariationAsConceptAction(selectedVariation);
      if (result.success) {
        setPanelSaved(selectedVariation.id);
      } else {
        setPanelActionError(result.error);
      }
    });
  }

  function handlePanelGenerateScript() {
    if (!selectedVariation) return;
    setPanelActionError(null);
    startGeneratingScript(async () => {
      const result = await generateScriptFromVariationAction(selectedVariation);
      if (result.success) {
        setPanelScripted(selectedVariation.id);
      } else {
        setPanelActionError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ── Top bar: generate + description ────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Creative Testing Lab
              </h2>
              <ProviderBadge provider="claude" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground max-w-xl">
              Generates 10 fresh angles preserving your trigger stack, persona, archetype, and
              offer — varying hooks, emotional tone, scenes, image prompts, and Kling 3.0 prompts.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={generating || variations.length === 0}
              onClick={handleGenerate}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium",
                "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
              Regenerate
            </button>

            <button
              type="button"
              disabled={generating}
              onClick={handleGenerate}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "Generating…" : "Generate 10 Variations"}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </section>

      {/* ── Filter bar (only when variations exist) ─────────────────────────── */}
      {variations.length > 0 && (
        <section className="space-y-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Filters
            </span>
            {filtersActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Emotional tone chips */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground">Emotional Tone</p>
            <div className="flex flex-wrap gap-1.5">
              {uniqueTones.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setFilterTone(filterTone === tone ? null : tone)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    filterTone === tone
                      ? "border-violet-400 bg-violet-100 text-violet-800"
                      : "border-border bg-background text-muted-foreground hover:border-violet-300 hover:text-foreground"
                  )}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger emphasis chips */}
          {uniqueTriggers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">Trigger Emphasis</p>
              <div className="flex flex-wrap gap-1.5">
                {uniqueTriggers.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilterTrigger(filterTrigger === key ? null : key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      filterTrigger === key
                        ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                        : "border-border bg-background text-muted-foreground hover:border-emerald-300 hover:text-foreground"
                    )}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Selected variation action bar ───────────────────────────────────── */}
      {selectedVariation && (
        <section className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Selected: <span className="text-primary">{selectedVariation.title}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {selectedVariation.emotionalTone}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {panelSaved === selectedVariation.id ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved as Concept
                </span>
              ) : (
                <button
                  type="button"
                  disabled={savingConcept}
                  onClick={handlePanelSaveAsConcept}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium",
                    "bg-background hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <BookmarkPlus className={cn("h-3.5 w-3.5", savingConcept && "animate-pulse")} />
                  {savingConcept ? "Saving…" : "Save as Concept"}
                </button>
              )}

              {panelScripted === selectedVariation.id ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Script Created
                </span>
              ) : (
                <button
                  type="button"
                  disabled={generatingScript}
                  onClick={handlePanelGenerateScript}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground",
                    "hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <FileText className={cn("h-3.5 w-3.5", generatingScript && "animate-pulse")} />
                  {generatingScript ? "Generating…" : "Generate Full Script"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-muted-foreground hover:text-foreground"
                title="Deselect"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {panelActionError && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {panelActionError}
            </div>
          )}
        </section>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────────── */}
      {generating && variations.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-background animate-pulse">
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-muted" />
                    <div className="h-2.5 w-1/2 rounded bg-muted" />
                  </div>
                </div>
                <div className="h-14 rounded-md bg-muted" />
                <div className="flex gap-1.5">
                  <div className="h-4 w-16 rounded-full bg-muted" />
                  <div className="h-4 w-20 rounded-full bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!generating && variations.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <FlaskConical className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">No variations generated yet</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Click "Generate 10 Variations" to create fresh creative angles from your current
            campaign setup.
          </p>
        </div>
      )}

      {/* ── Variation grid ───────────────────────────────────────────────────── */}
      {variations.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {filtersActive
                ? `${filteredVariations.length} of ${variations.length} variations`
                : `${variations.length} variations`}
            </h2>
            {generating && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Regenerating…
              </span>
            )}
            {filtersActive && filteredVariations.length === 0 && (
              <span className="text-xs text-muted-foreground">No matches — try clearing filters</span>
            )}
          </div>

          {filteredVariations.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVariations.map((variation) => (
                <VariationCard
                  key={variation.id}
                  variation={variation}
                  selected={selectedId === variation.id}
                  onSelect={() => handleSelect(variation.id)}
                  onSavedAsConcept={() => setPanelSaved(variation.id)}
                  onScriptGenerated={() => setPanelScripted(variation.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Footer note ──────────────────────────────────────────────────────── */}
      {variations.length > 0 && (
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <FlaskConical className="h-3 w-3" />
          Click a card to select it, then use the action bar above to save or generate a script.
          Per-card buttons work independently.
        </p>
      )}
    </div>
  );
}
