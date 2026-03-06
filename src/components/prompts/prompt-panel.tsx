"use client";

import { useState, useTransition } from "react";
import { useRef, useEffect } from "react";
import {
  Layers, Save, AlertCircle, ChevronDown, CheckCircle2, Circle,
  Copy, Check, Mic,
} from "lucide-react";
import type { Script } from "@/types";
import type { ScenePrompt, ScenePromptPack } from "@/types/prompt";
import { ScenePromptItem } from "./scene-prompt-item";
import {
  generatePromptPackAction,
  savePromptPackAction,
  regenerateScenePromptAction,
} from "@/app/actions/prompts";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "@/components/ui/provider-badge";

interface PromptPanelProps {
  campaignId: string;
  scripts: Script[];
  initialPack: ScenePromptPack | null;
  initialScriptId: string | null;
  initialVisualPlanId: string | null;
}

export function PromptPanel({
  campaignId,
  scripts,
  initialPack,
  initialScriptId,
  initialVisualPlanId,
}: PromptPanelProps) {
  const [scriptId, setScriptId] = useState<string | null>(initialScriptId);
  const [visualPlanId, setVisualPlanId] = useState<string | null>(initialVisualPlanId);
  const [scenes, setScenes] = useState<ScenePrompt[]>(initialPack?.scenes ?? []);
  const [voScript, setVoScript] = useState(initialPack?.voScript ?? "");
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const [generating, startGenerating] = useTransition();
  const [saving, startSaving] = useTransition();

  const hasPack = scenes.length > 0;
  const loading = generating || saving;

  function handleScriptChange(id: string) {
    setScriptId(id);
    setVisualPlanId(null);
    setScenes([]);
    setVoScript("");
    setIsDirty(false);
    setError(null);
    setSaveStatus("idle");
  }

  function handleGenerate() {
    if (!scriptId) return;
    setError(null);
    setSaveStatus("idle");
    startGenerating(async () => {
      const result = await generatePromptPackAction(campaignId, scriptId);
      if (result.success) {
        setScenes(result.pack.scenes);
        setVoScript(result.pack.voScript);
        setVisualPlanId(result.pack.visualPlanId);
        setIsDirty(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSceneChange(updated: ScenePrompt) {
    setScenes((prev) =>
      prev.map((s) => (s.sceneNumber === updated.sceneNumber ? updated : s))
    );
    setIsDirty(true);
    setSaveStatus("idle");
  }

  async function handleSceneRegenerate(sceneNumber: number): Promise<ScenePrompt | null> {
    if (!scriptId) return null;
    const result = await regenerateScenePromptAction(campaignId, scriptId, sceneNumber);
    if (result.success) {
      setIsDirty(true);
      setSaveStatus("idle");
      return result.scene;
    }
    setError(result.error);
    return null;
  }

  function handleSave() {
    if (!visualPlanId) return;
    setError(null);
    startSaving(async () => {
      const result = await savePromptPackAction(campaignId, visualPlanId, scenes, voScript);
      if (result.success) {
        setIsDirty(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setError(result.error);
      }
    });
  }

  if (scripts.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={Layers}
          title="No scripts yet"
          description="Generate a script and visual plan first, then come back to build your prompt pack."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Script selector + generate */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Source Script
          </label>
          <ProviderBadge provider="openai" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ScriptPicker
              scripts={scripts}
              selectedId={scriptId}
              onSelect={handleScriptChange}
              disabled={loading}
            />
          </div>
          <button
            type="button"
            disabled={!scriptId || loading}
            onClick={handleGenerate}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            )}
          >
            <Layers className={cn("h-4 w-4", generating && "animate-pulse")} />
            {generating ? "Generating…" : hasPack ? "Regenerate Pack" : "Generate Prompt Pack"}
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

      {/* Loading skeleton */}
      {generating && (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 rounded-lg bg-muted" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {/* Pack content */}
      {hasPack && !generating && (
        <>
          {/* VO script section */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ElevenLabs Voiceover Script
                </p>
              </div>
              <CopyButton text={voScript} />
            </div>
            <div className="rounded-lg border bg-muted/20">
              <textarea
                value={voScript}
                onChange={(e) => { setVoScript(e.target.value); setIsDirty(true); setSaveStatus("idle"); }}
                rows={12}
                disabled={loading}
                className="w-full resize-y rounded-lg bg-transparent px-4 py-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </section>

          {/* Scene prompts */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Scene Prompts — {scenes.length} scenes
              </p>
              <span className="text-xs text-muted-foreground">
                {scenes.filter((s) => s.sceneType === "A-roll").length} A-roll ·{" "}
                {scenes.filter((s) => s.sceneType === "B-roll").length} B-roll
              </span>
            </div>
            <div className="space-y-3">
              {scenes.map((scene) => (
                <ScenePromptItem
                  key={scene.sceneNumber}
                  scene={scene}
                  campaignId={campaignId}
                  scriptId={scriptId ?? ""}
                  onChange={handleSceneChange}
                  onRegenerate={handleSceneRegenerate}
                />
              ))}
            </div>
          </section>

          {/* Save bar */}
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
              disabled={!isDirty || loading || !visualPlanId}
              onClick={handleSave}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium",
                "hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save All Changes"}
            </button>
          </div>
        </>
      )}

      {/* Empty states */}
      {!hasPack && !generating && scriptId && (
        <EmptyState
          icon={Layers}
          title="Ready to generate"
          description='Click "Generate Prompt Pack" to build production-ready image and video prompts from this script.'
        />
      )}
      {!hasPack && !generating && !scriptId && (
        <EmptyState
          icon={Layers}
          title="Select a script above"
          description="Choose a script to generate its full production prompt pack."
        />
      )}
    </div>
  );
}

// ── Copy button ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        copied && "border-emerald-400 text-emerald-600"
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy Script"}
    </button>
  );
}

// ── Script picker ──────────────────────────────────────────────────────────

interface ScriptPickerProps {
  scripts: Script[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

function ScriptPicker({ scripts, selectedId, onSelect, disabled }: ScriptPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = scripts.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? (selected.versionName ?? `Script ${selected.id.slice(-6)}`) : "Select a script…"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="py-1">
            {scripts.map((script) => (
              <li key={script.id}>
                <button
                  type="button"
                  onClick={() => { onSelect(script.id); setOpen(false); }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent",
                    script.id === selectedId && "bg-accent/50"
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {script.id === selectedId
                      ? <CheckCircle2 className="h-4 w-4 text-primary" />
                      : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium">{script.versionName ?? `Script ${script.id.slice(-6)}`}</span>
                    {script.hook && (
                      <span className="line-clamp-1 text-xs text-muted-foreground">{script.hook}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <Icon className="mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
