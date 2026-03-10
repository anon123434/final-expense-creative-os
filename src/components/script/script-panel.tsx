"use client";

import { useState, useTransition, useRef } from "react";
import { Sparkles, Save, AlertCircle, Mic, Copy, Check, Cpu, Bot, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import type { AdConcept, Script } from "@/types";
import type { Campaign } from "@/types";
import type { HookVariant } from "@/types/script";
import type { ScriptTransform } from "@/lib/services/script-transforms";
import { ConceptPicker } from "./concept-picker";
import { QuickActions } from "./quick-actions";
import { generateScriptAction, applyTransformAction, saveScriptAction, generateHookVariationsAction, applyHookAndRegenerateAction } from "@/app/actions/script";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "@/components/ui/provider-badge";

interface ScriptPanelProps {
  campaign: Campaign;
  concepts: AdConcept[];
  initialScript: Script | null;
  initialConceptId: string | null;
}

function scriptToFull(s: Script): string {
  return [s.hook, s.body, s.cta].filter(Boolean).join("\n\n") || s.fullScript || "";
}

function parseFullScript(text: string): { hook: string; body: string; cta: string } {
  const parts = text.split(/\n\n+/);
  if (parts.length >= 3) {
    return { hook: parts[0], body: parts.slice(1, -1).join("\n\n"), cta: parts[parts.length - 1] };
  }
  if (parts.length === 2) return { hook: parts[0], body: parts[1], cta: "" };
  return { hook: "", body: text, cta: "" };
}

export function ScriptPanel({
  campaign,
  concepts,
  initialScript,
  initialConceptId,
}: ScriptPanelProps) {
  const [conceptId, setConceptId] = useState<string | null>(initialConceptId);
  const [duration, setDuration] = useState<30 | 60 | 90>(30);
  const [customPrompt, setCustomPrompt] = useState("");
  const [fullScript, setFullScript] = useState(initialScript ? scriptToFull(initialScript) : "");
  const [taggedScript, setTaggedScript] = useState("");
  const [hasScript, setHasScript] = useState(!!initialScript);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [activeTransform, setActiveTransform] = useState<ScriptTransform | null>(null);
  const [copied, setCopied] = useState(false);
  const [genStatus, setGenStatus] = useState<{ scriptProvider: string; voProvider: string } | null>(null);

  const [hookVariants, setHookVariants] = useState<HookVariant[]>([]);
  const [hookLabOpen, setHookLabOpen] = useState(false);
  const [hookLabError, setHookLabError] = useState<string | null>(null);
  const [usedHookIndex, setUsedHookIndex] = useState<number | null>(null);
  const [scriptFlash, setScriptFlash] = useState(false);
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [generating, startGenerating] = useTransition();
  const [transforming, startTransforming] = useTransition();
  const [saving, startSaving] = useTransition();
  const [generatingHooks, startGeneratingHooks] = useTransition();
  const [applyingHook, startApplyingHook] = useTransition();

  const loading = generating || transforming || saving || applyingHook;

  function handleConceptChange(id: string) {
    setConceptId(id);
    setFullScript("");
    setTaggedScript("");
    setHasScript(false);
    setIsDirty(false);
    setError(null);
    setSaveStatus("idle");
    setGenStatus(null);
  }

  function handleGenerate() {
    if (!conceptId) return;
    setError(null);
    setSaveStatus("idle");
    startGenerating(async () => {
      const result = await generateScriptAction(campaign.id, conceptId, duration, customPrompt.trim() || undefined);
      if (result.success) {
        setFullScript(scriptToFull(result.script));
        setTaggedScript(result.taggedScript ?? "");
        setHasScript(true);
        setIsDirty(false);
        setGenStatus({ scriptProvider: result.scriptProvider, voProvider: result.voProvider });
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
      const { hook, body, cta } = parseFullScript(fullScript);
      const result = await applyTransformAction(campaign.id, conceptId, hook, body, cta, transform);
      if (result.success) {
        setFullScript(scriptToFull(result.script));
        setTaggedScript("");
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
      const { hook, body, cta } = parseFullScript(fullScript);
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

  function handleCopy() {
    navigator.clipboard.writeText(taggedScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleGenerateHooks() {
    if (!conceptId || !hasScript) return;
    setHookLabError(null);
    const { hook, body, cta } = parseFullScript(fullScript);
    startGeneratingHooks(async () => {
      const result = await generateHookVariationsAction(campaign.id, conceptId, hook, body, cta);
      if (result.success) {
        setHookVariants(result.data.hooks);
        setHookLabOpen(true);
      } else {
        setHookLabError(result.error);
      }
    });
  }

  function handleUseHook(newHook: string, index: number) {
    if (!conceptId) return;
    setUsedHookIndex(index);
    setError(null);
    setSaveStatus("idle");
    startApplyingHook(async () => {
      const result = await applyHookAndRegenerateAction(campaign.id, conceptId, newHook, duration);
      if (result.success) {
        setFullScript(scriptToFull(result.script));
        setTaggedScript(result.taggedScript ?? "");
        setHasScript(true);
        setIsDirty(false);
        setGenStatus({ scriptProvider: result.scriptProvider, voProvider: result.voProvider });
        setHookLabOpen(false);
        // Scroll to textarea and flash it
        setTimeout(() => {
          scriptTextareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        setScriptFlash(true);
        setTimeout(() => setScriptFlash(false), 1200);
      } else {
        setError(result.error);
      }
      setUsedHookIndex(null);
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
          {/* Duration selector */}
          <div className="flex shrink-0 rounded-md border text-sm">
            {([30, 60, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                disabled={loading}
                onClick={() => setDuration(d)}
                className={cn(
                  "px-3 py-2 font-medium transition-colors first:rounded-l-md last:rounded-r-md",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  duration === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {d}s
              </button>
            ))}
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

      {/* Custom prompt */}
      <section className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Custom Instructions <span className="font-normal normal-case text-muted-foreground/60">(optional)</span>
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          disabled={loading}
          rows={2}
          placeholder='e.g. "Start the hook with a question about funeral costs" or "Use phone number 1-888-200-0000" or "Make the tone more urgent"'
          className={cn(
            "w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generation status */}
      {genStatus && (
        <ProviderStatus scriptProvider={genStatus.scriptProvider} voProvider={genStatus.voProvider} />
      )}

      {/* Script editor */}
      {hasScript && (
        <>
          {/* Full script — single editable box */}
          <section className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ad Script
            </label>
            <textarea
              ref={scriptTextareaRef}
              value={fullScript}
              onChange={(e) => { setFullScript(e.target.value); setIsDirty(true); setSaveStatus("idle"); }}
              disabled={loading}
              rows={12}
              className={cn(
                "w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "transition-[box-shadow] duration-300",
                scriptFlash && "ring-2 ring-[#00E676]/60 border-[#00E676]/40"
              )}
            />
          </section>

          {/* ElevenLabs tagged script — read-only preview */}
          {taggedScript && (
            <section className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    ElevenLabs — Emotion Tagged
                  </label>
                  <ProviderBadge provider="openai" />
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <textarea
                readOnly
                value={taggedScript}
                rows={12}
                className={cn(
                  "w-full resize-y rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed text-foreground/80",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
              />
            </section>
          )}

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

          {/* Hook Lab */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hook Lab
              </p>
              <button
                type="button"
                onClick={handleGenerateHooks}
                disabled={loading || generatingHooks}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
                  "border border-border hover:bg-accent",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <Lightbulb className={cn("h-3.5 w-3.5", generatingHooks && "animate-pulse")} />
                {generatingHooks ? "Generating…" : "Generate Hook Ideas"}
              </button>
            </div>

            {hookLabError && (
              <p className="text-xs text-destructive">{hookLabError}</p>
            )}

            {hookVariants.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setHookLabOpen((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {hookLabOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {hookLabOpen ? "Hide" : "Show"} {hookVariants.length} hook variations
                </button>

                {hookLabOpen && (
                  <div className="space-y-2">
                    {hookVariants.map((v, i) => (
                      <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-violet-200 bg-violet-50 text-violet-700">
                                {v.hookType}
                              </span>
                              {v.triggers.map((t) => (
                                <span key={t} className="text-[10px] text-muted-foreground">· {t}</span>
                              ))}
                            </div>
                            <p className="text-sm leading-snug">{v.hook}</p>
                            <p className="text-[11px] text-muted-foreground italic">{v.emotionalCore}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUseHook(v.hook, i)}
                            disabled={applyingHook || loading}
                            className={cn(
                              "shrink-0 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                              "disabled:cursor-not-allowed disabled:opacity-60",
                              usedHookIndex === i && applyingHook
                                ? "bg-muted text-muted-foreground border border-border"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                          >
                            {usedHookIndex === i && applyingHook
                              ? <><Sparkles className="h-3 w-3 animate-pulse" /> Generating…</>
                              : "Use →"}
                          </button>
                        </div>
                        {v.visualMoments.length > 0 && (
                          <div className="border-t pt-2 space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Visual Moments
                            </p>
                            <ul className="space-y-0.5">
                              {v.visualMoments.map((m, j) => (
                                <li key={j} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                  {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            Click "Generate Script" to create a script and ElevenLabs preview.
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

// ── Provider status banner ────────────────────────────────────────────────

function providerLabel(p: string): { label: string; className: string; icon: React.ReactNode } {
  if (p === "claude") return { label: "Claude", className: "bg-violet-500/10 text-violet-600 border-violet-500/20", icon: <Bot className="h-3 w-3" /> };
  if (p === "openai") return { label: "OpenAI", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: <Bot className="h-3 w-3" /> };
  if (p === "mock")   return { label: "Mock data — add API key in Settings to use real AI", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <Cpu className="h-3 w-3" /> };
  return { label: p, className: "bg-muted text-muted-foreground border-border", icon: <Cpu className="h-3 w-3" /> };
}

function ProviderStatus({ scriptProvider, voProvider }: { scriptProvider: string; voProvider: string }) {
  const script = providerLabel(scriptProvider);
  const vo = providerLabel(voProvider);
  const bothMock = scriptProvider === "mock" && (voProvider === "mock" || voProvider === "none");

  if (bothMock) {
    return (
      <div className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-xs", script.className)}>
        {script.icon}
        <span>Generated with mock data — add your API keys in <strong>Settings</strong> to use Claude + OpenAI.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <div className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium", script.className)}>
        {script.icon}
        <span>Script: {script.label}</span>
      </div>
      {voProvider !== "none" && (
        <div className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium", vo.className)}>
          {vo.icon}
          <span>ElevenLabs: {vo.label}</span>
        </div>
      )}
    </div>
  );
}
