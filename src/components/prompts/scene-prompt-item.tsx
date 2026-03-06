"use client";

import { useState, useTransition } from "react";
import {
  Copy, Check, RefreshCw, Camera, Clapperboard, ImageIcon, Film,
} from "lucide-react";
import type { ScenePrompt } from "@/types/prompt";
import { cn } from "@/lib/utils";

interface ScenePromptItemProps {
  scene: ScenePrompt;
  campaignId: string;
  scriptId: string;
  onChange: (updated: ScenePrompt) => void;
  onRegenerate: (sceneNumber: number) => Promise<ScenePrompt | null>;
}

export function ScenePromptItem({
  scene,
  onChange,
  onRegenerate,
}: ScenePromptItemProps) {
  const [regenerating, startRegenerate] = useTransition();

  function update(field: "imagePrompt" | "klingPrompt", value: string) {
    onChange({ ...scene, [field]: value });
  }

  function handleRegenerate() {
    startRegenerate(async () => {
      const updated = await onRegenerate(scene.sceneNumber);
      if (updated) onChange(updated);
    });
  }

  return (
    <div className="rounded-lg border bg-background">
      {/* Scene header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {/* Scene number */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
          {scene.sceneNumber}
        </span>

        {/* Type badge */}
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            scene.sceneType === "A-roll"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          {scene.sceneType === "A-roll" ? (
            <Camera className="h-2.5 w-2.5" />
          ) : (
            <Clapperboard className="h-2.5 w-2.5" />
          )}
          {scene.sceneType}
        </span>

        {/* Scene metadata */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{scene.setting}</span>
          {scene.lineReference && (
            <span className="truncate text-xs italic text-muted-foreground">
              "{scene.lineReference}"
            </span>
          )}
        </div>

        {/* Emotion chip */}
        <span className="shrink-0 rounded-md border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">
          {scene.emotion}
        </span>

        {/* Regenerate button */}
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          title="Regenerate this scene's prompts"
          className={cn(
            "shrink-0 rounded-md border p-1.5 text-muted-foreground transition-colors hover:bg-accent",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} />
        </button>
      </div>

      {/* Prompt fields */}
      <div className="grid grid-cols-2 gap-0 divide-x">
        <PromptField
          label="Image Prompt"
          sublabel="Seedream / NanoBanana"
          icon={ImageIcon}
          value={scene.imagePrompt}
          onChange={(v) => update("imagePrompt", v)}
          accentColor="violet"
          disabled={regenerating}
        />
        <PromptField
          label="Kling 3.0 Motion Prompt"
          sublabel="Image-to-video"
          icon={Film}
          value={scene.klingPrompt}
          onChange={(v) => update("klingPrompt", v)}
          accentColor="sky"
          disabled={regenerating}
        />
      </div>
    </div>
  );
}

// ── Prompt field with copy ─────────────────────────────────────────────────

interface PromptFieldProps {
  label: string;
  sublabel: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  accentColor: "violet" | "sky";
  disabled?: boolean;
}

function PromptField({
  label,
  sublabel,
  icon: Icon,
  value,
  onChange,
  accentColor,
  disabled,
}: PromptFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const headerBg = accentColor === "violet" ? "bg-violet-50/60" : "bg-sky-50/60";
  const iconColor = accentColor === "violet" ? "text-violet-500" : "text-sky-500";
  const labelColor = accentColor === "violet" ? "text-violet-700" : "text-sky-700";
  const copyHover = accentColor === "violet"
    ? "border-violet-200 text-violet-600 hover:bg-violet-50"
    : "border-sky-200 text-sky-600 hover:bg-sky-50";
  const textareaBorder = accentColor === "violet"
    ? "border-violet-100 bg-violet-50/30 focus:ring-violet-400"
    : "border-sky-100 bg-sky-50/30 focus:ring-sky-400";

  return (
    <div className="flex flex-col">
      {/* Field header */}
      <div className={cn("flex items-center justify-between border-b px-3 py-2", headerBg)}>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
          <div>
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", labelColor)}>
              {label}
            </span>
            <span className="ml-1.5 text-[10px] text-muted-foreground">{sublabel}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
            "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1",
            copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : copyHover
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Editable textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={5}
        className={cn(
          "w-full resize-y px-3 py-2.5 text-xs leading-relaxed",
          "focus:outline-none focus:ring-1 focus:ring-inset",
          textareaBorder,
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  );
}
