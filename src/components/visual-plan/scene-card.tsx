"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Clapperboard, Camera, Sparkles, Download } from "lucide-react";
import type { SceneCard } from "@/types/scene";
import { cn } from "@/lib/utils";
import { generateSceneImageAction } from "@/app/actions/visual-plan";

interface SceneCardProps {
  scene: SceneCard;
  onChange: (updated: SceneCard) => void;
  campaignId: string;
  avatarImageUrl?: string | null;
}

type EditableField = keyof Omit<SceneCard, "sceneNumber" | "sceneType">;

export function SceneCardItem({ scene, onChange, campaignId, avatarImageUrl }: SceneCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  function update(field: EditableField, value: string) {
    onChange({ ...scene, [field]: value });
  }

  function toggleType() {
    onChange({ ...scene, sceneType: scene.sceneType === "A-roll" ? "B-roll" : "A-roll" });
  }

  async function handleGenerateImage() {
    if (!scene.imagePrompt || generatingImage) return;
    setGeneratingImage(true);
    setImageError(null);
    const result = await generateSceneImageAction(
      campaignId,
      scene.sceneNumber,
      scene.imagePrompt,
      avatarImageUrl
    );
    setGeneratingImage(false);
    if (result.success) {
      onChange({ ...scene, generatedImageUrl: result.data.url });
    } else {
      setImageError(result.error);
    }
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

        {/* Generated image thumbnail in header */}
        {scene.generatedImageUrl && !expanded && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={scene.generatedImageUrl}
            alt="Generated"
            className="h-8 w-14 rounded object-cover border border-border shrink-0"
          />
        )}

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

          {/* Image prompt + generate */}
          <CopyableField
            label="Image Prompt"
            value={scene.imagePrompt}
            onChange={(v) => update("imagePrompt", v)}
            rows={3}
            accentColor="violet"
          />

          {/* Generated image or generate button */}
          <div className="space-y-2">
            {scene.generatedImageUrl ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Generated Image
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      {generatingImage ? "Regenerating…" : "Regenerate"}
                    </button>
                  </div>
                </div>
                <div className="group relative aspect-video w-full overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scene.generatedImageUrl}
                    alt={`Scene ${scene.sceneNumber}`}
                    className="h-full w-full object-cover"
                  />
                  <a
                    href={scene.generatedImageUrl}
                    download={`scene-${scene.sceneNumber}.jpg`}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                    title="Download image"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {imageError && (
                  <p className="text-xs text-destructive">{imageError}</p>
                )}
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || !scene.imagePrompt}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 text-sm font-medium transition-colors",
                    "border-violet-200 text-violet-600 hover:bg-violet-50/50 hover:border-violet-300",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <Sparkles className={cn("h-4 w-4", generatingImage && "animate-pulse")} />
                  {generatingImage ? "Generating image…" : "Generate Image"}
                  {avatarImageUrl && !generatingImage && (
                    <span className="text-[10px] text-violet-400 font-normal">· using avatar reference</span>
                  )}
                </button>
              </div>
            )}
          </div>

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
