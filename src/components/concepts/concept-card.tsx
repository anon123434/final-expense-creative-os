"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import type { AdConcept } from "@/types";
import { cn } from "@/lib/utils";

interface ConceptCardProps {
  concept: AdConcept;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function ConceptCard({ concept, isSelected, onSelect, onDelete, deleting }: ConceptCardProps) {
  const [expanded, setExpanded] = useState(isSelected);
  const [copied, setCopied] = useState<string | null>(null);

  function copyField(label: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const triggers = concept.triggerMap
    ? Object.entries(concept.triggerMap)
        .filter(([, v]) => v === true)
        .map(([k]) => k)
    : [];

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-colors",
        isSelected ? "border-primary/60 ring-1 ring-primary/20" : "border-border"
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        {/* Select toggle */}
        <button
          type="button"
          onClick={() => onSelect(concept.id)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
          aria-label={isSelected ? "Deselect concept" : "Select concept"}
        >
          {isSelected ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        {/* Title + angle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm leading-snug truncate">
              {concept.title}
            </h3>
            {isSelected && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                Active
              </span>
            )}
          </div>
          {concept.oneSentenceAngle && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {concept.oneSentenceAngle}
            </p>
          )}

          {/* Trigger badges */}
          {triggers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {triggers.map((t) => (
                <span
                  key={t}
                  className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* Delete button */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="mt-0.5 shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors disabled:cursor-not-allowed"
            aria-label="Delete concept"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <ConceptField
            label="Hook"
            value={concept.hook}
            onCopy={copyField}
            copied={copied}
          />
          <ConceptField
            label="Emotional Setup"
            value={concept.emotionalSetup}
            onCopy={copyField}
            copied={copied}
          />
          <ConceptField
            label="Conflict"
            value={concept.conflict}
            onCopy={copyField}
            copied={copied}
          />
          <ConceptField
            label="Solution"
            value={concept.solution}
            onCopy={copyField}
            copied={copied}
          />
          <ConceptField
            label="Payoff"
            value={concept.payoff}
            onCopy={copyField}
            copied={copied}
          />
          <ConceptField
            label="CTA"
            value={concept.cta}
            onCopy={copyField}
            copied={copied}
          />
          {concept.visualWorld && (
            <ConceptField
              label="Visual World"
              value={concept.visualWorld}
              onCopy={copyField}
              copied={copied}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Field row ──────────────────────────────────────────────────────────────

interface ConceptFieldProps {
  label: string;
  value: string | null | undefined;
  onCopy: (label: string, value: string) => void;
  copied: string | null;
}

function ConceptField({ label, value, onCopy, copied }: ConceptFieldProps) {
  if (!value) return null;
  const isCopied = copied === label;

  return (
    <div className="group flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => onCopy(label, value)}
        className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        aria-label={`Copy ${label}`}
      >
        {isCopied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
