"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Clapperboard, Camera } from "lucide-react";
import type { SceneCard } from "@/types/scene";
import { cn } from "@/lib/utils";

interface SceneCardProps {
  scene: SceneCard;
  onChange: (updated: SceneCard) => void;
}

type EditableField = keyof Omit<SceneCard, "sceneNumber" | "sceneType">;

export function SceneCardItem({ scene, onChange }: SceneCardProps) {
  const [expanded, setExpanded] = useState(false);

  function update(field: EditableField, value: string) {
    onChange({ ...scene, [field]: value });
  }

  function toggleType() {
    onChange({ ...scene, sceneType: scene.sceneType === "A-roll" ? "B-roll" : "A-roll" });
  }

  return (
    <div className={cn(
      "rounded-lg border bg-background transition-shadow",
      expanded && "shadow-sm"
    )}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 px-4 py-3 text-left"
      >
        {/* Scene number badge */}
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
          {scene.sceneNumber}
        </span>

        {/* Type chip */}
        <span
          onClick={(e) => { e.stopPropagation(); toggleType(); }}
          className={cn(
            "mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none",
            scene.sceneType === "A-roll"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          )}
        >
          {scene.sceneType === "A-roll" ? (
            <Camera className="h-2.5 w-2.5" />
          ) : (
            <Clapperboard className="h-2.5 w-2.5" />
          )}
          {scene.sceneType}
        </span>

        {/* Shot idea summary */}
        <span className="flex-1 text-sm">
          <span className="font-medium">{scene.shotIdea || "Untitled scene"}</span>
          {scene.lineReference && (
            <span className="ml-2 text-xs text-muted-foreground italic">
              "{scene.lineReference}"
            </span>
          )}
        </span>

        {/* Expand chevron */}
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SceneField
              label="Line Reference"
              value={scene.lineReference}
              onChange={(v) => update("lineReference", v)}
              rows={2}
            />
            <SceneField
              label="Setting"
              value={scene.setting}
              onChange={(v) => update("setting", v)}
              rows={2}
            />
            <SceneField
              label="Shot Idea"
              value={scene.shotIdea}
              onChange={(v) => update("shotIdea", v)}
              rows={2}
            />
            <SceneField
              label="Emotion"
              value={scene.emotion}
              onChange={(v) => update("emotion", v)}
              rows={2}
            />
            <SceneField
              label="Camera Style"
              value={scene.cameraStyle}
              onChange={(v) => update("cameraStyle", v)}
              rows={2}
            />
          </div>

          {/* Image prompt */}
          <CopyableField
            label="Image Prompt (NanoBanana)"
            value={scene.imagePrompt}
            onChange={(v) => update("imagePrompt", v)}
            rows={3}
            accentColor="violet"
          />

          {/* Kling prompt */}
          <CopyableField
            label="Kling 3.0 Video Prompt"
            value={scene.klingPrompt}
            onChange={(v) => update("klingPrompt", v)}
            rows={4}
            accentColor="sky"
          />
        </div>
      )}
    </div>
  );
}

// ── Internal components ────────────────────────────────────────────────────

interface SceneFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

function SceneField({ label, value, onChange, rows = 2 }: SceneFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={cn(
          "w-full resize-none rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs leading-relaxed",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        )}
      />
    </div>
  );
}

interface CopyableFieldProps extends SceneFieldProps {
  accentColor: "violet" | "sky";
}

function CopyableField({ label, value, onChange, rows, accentColor }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const accentClass = accentColor === "violet"
    ? "text-violet-600 border-violet-200 bg-violet-50"
    : "text-sky-600 border-sky-200 bg-sky-50";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
            copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : accentClass
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-md border px-2.5 py-1.5 text-xs leading-relaxed",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          accentColor === "violet"
            ? "border-violet-100 bg-violet-50/50 focus:ring-violet-400"
            : "border-sky-100 bg-sky-50/50 focus:ring-sky-400"
        )}
      />
    </div>
  );
}
