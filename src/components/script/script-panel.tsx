"use client";

import { useState, useTransition } from "react";
import { Sparkles, Save, AlertCircle } from "lucide-react";
import type { AdConcept, Script } from "@/types";
import type { Campaign } from "@/types";
import type { ScriptTransform } from "@/lib/services/script-transforms";
import { ConceptPicker } from "./concept-picker";
import { QuickActions } from "./quick-actions";
import { generateScriptAction, applyTransformAction, saveScriptAction } from "@/app/actions/script";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "@/components/ui/provider-badge";

interface ScriptPanelProps {
  campaign: Campaign;
  concepts: AdConcept[];
  initialScript: Script | null;
  initialConceptId: string | null;
}

export function ScriptPanel({
  campaign,
  concepts,
  initialScript,
  initialConceptId,
}: ScriptPanelProps) {
  const [conceptId, setConceptId] = useState<string | null>(initialConceptId);
  const [hook, setHook] = useState(initialScript?.hook ?? "");
  const [body, setBody] = useState(initialScript?.body ?? "");
  const [cta, setCta] = useState(initialScript?.cta ?? "");
  const [hasScript, setHasScript] = useState(!!initialScript);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [activeTransform, setActiveTransform] = useState<ScriptTransform | null>(null);

  const [generating, startGenerating] = useTransition();
  const [transforming, startTransforming] = useTransition();
  const [saving, startSaving] = useTransition();

  const loading = generating || transforming || saving;

  function handleConceptChange(id: string) {
    setConceptId(id);
    // Reset script when concept changes
    setHook("");
    setBody("");
    setCta("");
    setHasScript(false);
    setIsDirty(false);
    setError(null);
    setSaveStatus("idle");
  }

  function handleGenerate() {
    if (!conceptId) return;
    setError(null);
    setSaveStatus("idle");
    startGenerating(async () => {
      const result = await generateScriptAction(campaign.id, conceptId);
      if (result.success) {
        setHook(result.script.hook ?? "");
        setBody(result.script.body ?? "");
        setCta(result.script.cta ?? "");
        setHasScript(true);
        setIsDirty(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleTransform(transform: ScriptTransform) {
    if (!conceptId || !hasScript) return;
    setError(null);
    setSaveStatus("idle");
    setActiveTransform(transform);
    startTransforming(async () => {
      const result = await applyTransformAction(
        campaign.id,
        conceptId,
        hook,
        body,
        cta,
        transform
      );
      if (result.success) {
        setHook(result.script.hook ?? "");
        setBody(result.script.body ?? "");
        setCta(result.script.cta ?? "");
        setIsDirty(false);
      } else {
        setError(result.error);
      }
      setActiveTransform(null);
    });
  }

  function handleSave() {
    if (!conceptId || !hasScript) return;
    setError(null);
    startSaving(async () => {
      const result = await saveScriptAction(campaign.id, conceptId, hook, body, cta);
      if (result.success) {
        setIsDirty(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Concept selection */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Concept
          </label>
          <ProviderBadge provider="claude" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ConceptPicker
              concepts={concepts}
              selectedId={conceptId}
              onSelect={handleConceptChange}
              disabled={loading}
            />
          </div>
          <button
            type="button"
            disabled={!conceptId || loading}
            onClick={handleGenerate}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            )}
          >
            <Sparkles className={cn("h-4 w-4", generating && "animate-pulse")} />
            {generating ? "Generating…" : hasScript ? "Regenerate" : "Generate Script"}
          </button>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Script editor */}
      {hasScript && (
        <>
          <section className="space-y-4">
            <ScriptField
              label="Hook"
              value={hook}
              onChange={(v) => { setHook(v); setIsDirty(true); setSaveStatus("idle"); }}
              disabled={loading}
              rows={3}
            />
            <ScriptField
              label="Body"
              value={body}
              onChange={(v) => { setBody(v); setIsDirty(true); setSaveStatus("idle"); }}
              disabled={loading}
              rows={6}
            />
            <ScriptField
              label="Call to Action"
              value={cta}
              onChange={(v) => { setCta(v); setIsDirty(true); setSaveStatus("idle"); }}
              disabled={loading}
              rows={3}
            />
          </section>

          {/* Quick actions */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </p>
            <QuickActions
              onTransform={handleTransform}
              loading={transforming}
              activeTransform={activeTransform}
            />
          </section>

          {/* Save */}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-xs text-muted-foreground">
              {saveStatus === "saved"
                ? "Saved!"
                : isDirty
                ? "Unsaved changes"
                : "No unsaved changes"}
            </span>
            <button
              type="button"
              disabled={!isDirty || loading}
              onClick={handleSave}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                "border hover:bg-accent",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!hasScript && !generating && conceptId && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Sparkles className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Ready to generate</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click "Generate Script" to create a script for this concept.
          </p>
        </div>
      )}

      {!hasScript && !generating && !conceptId && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">Select a concept above to get started.</p>
        </div>
      )}
    </div>
  );
}

// ── Internal sub-component ─────────────────────────────────────────────────

interface ScriptFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
}

function ScriptField({ label, value, onChange, disabled, rows = 4 }: ScriptFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  );
}
