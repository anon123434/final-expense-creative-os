"use client";

import { useState, useTransition } from "react";
import { Lightbulb, Sparkles, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import type { AdConcept } from "@/types";
import { ConceptCard } from "./concept-card";
import {
  generateConceptsAction,
  selectConceptAction,
  deleteConceptAction,
} from "@/app/actions/concepts";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "@/components/ui/provider-badge";

interface ConceptGeneratorPanelProps {
  campaignId: string;
  initialConcepts: AdConcept[];
}

export function ConceptGeneratorPanel({
  campaignId,
  initialConcepts,
}: ConceptGeneratorPanelProps) {
  const [concepts, setConcepts] = useState<AdConcept[]>(initialConcepts);
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();
  const [selecting, startSelecting] = useTransition();
  const [deleting, startDeleting] = useTransition();

  const loading = generating || selecting || deleting;
  const hasConcepts = concepts.length > 0;

  function handleGenerate() {
    setError(null);
    startGenerating(async () => {
      const result = await generateConceptsAction(campaignId);
      if (result.success) {
        // Prepend new concepts, keep any existing ones
        setConcepts((prev) => {
          const newIds = new Set(result.data.map((c) => c.id));
          const existing = prev.filter((c) => !newIds.has(c.id));
          return [...result.data, ...existing];
        });
      } else {
        setError(result.error);
      }
    });
  }

  function handleSelect(conceptId: string) {
    setError(null);
    startSelecting(async () => {
      const result = await selectConceptAction(campaignId, conceptId);
      if (result.success) {
        setConcepts((prev) =>
          prev.map((c) => ({ ...c, isSelected: c.id === conceptId }))
        );
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete(conceptId: string) {
    setError(null);
    startDeleting(async () => {
      const result = await deleteConceptAction(campaignId, conceptId);
      if (result.success) {
        setConcepts((prev) => prev.filter((c) => c.id !== conceptId));
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ad Concepts
          </p>
          <ProviderBadge provider="claude" />
          {hasConcepts && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {concepts.length}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleGenerate}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          )}
        >
          {hasConcepts ? (
            <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
          ) : (
            <Sparkles className={cn("h-4 w-4", generating && "animate-pulse")} />
          )}
          {generating
            ? "Generating…"
            : hasConcepts
            ? "Generate More"
            : "Generate Concepts"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generating skeleton */}
      {generating && (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {/* Concept list */}
      {hasConcepts && !generating && (
        <div className="space-y-3">
          {concepts.map((concept) => (
            <div key={concept.id} className="group relative">
              <ConceptCard
                concept={concept}
                isSelected={concept.isSelected}
                onSelect={handleSelect}
              />
              {/* Delete button — appears on hover */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDelete(concept.id)}
                className={cn(
                  "absolute right-3 top-3 rounded-md p-1.5",
                  "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  "disabled:cursor-not-allowed",
                  // Hidden — revealed on group hover
                )}
                aria-label="Delete concept"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasConcepts && !generating && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lightbulb className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-base font-semibold">No concepts yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Click &quot;Generate Concepts&quot; to create 2–3 creative ad concepts based on
            your campaign brief and trigger stack.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className={cn(
              "mt-6 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Generate Concepts
          </button>
        </div>
      )}

      {/* Selection hint */}
      {hasConcepts && !generating && (
        <p className="text-center text-xs text-muted-foreground">
          Click the circle to set the active concept — it will be used when
          generating scripts.
        </p>
      )}
    </div>
  );
}
