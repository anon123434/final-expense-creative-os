"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarUploadZone } from "./avatar-upload-zone";
import { ProviderBadge } from "@/components/ui/provider-badge";
import type { AvatarMode, AspectRatio } from "@/types/avatar";

interface AvatarControlsProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  referenceImage: string | null;
  onReferenceImageChange: (v: string | null) => void;
  mode: AvatarMode;
  onModeChange: (v: AvatarMode) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (v: AspectRatio) => void;
  onGenerate: () => void;
  generating: boolean;
}

export function AvatarControls({
  prompt, onPromptChange,
  referenceImage, onReferenceImageChange,
  mode, onModeChange,
  aspectRatio, onAspectRatioChange,
  onGenerate, generating,
}: AvatarControlsProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1
          className="text-sm font-bold uppercase tracking-widest"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--primary)", letterSpacing: "0.15em" }}
        >
          Avatar Generation
        </h1>
        <ProviderBadge provider="gemini" />
      </div>

      {/* Upload zone */}
      <div className="space-y-1.5">
        <label
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Reference Image{" "}
          <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">
            — optional
          </span>
        </label>
        <AvatarUploadZone
          value={referenceImage}
          onChange={onReferenceImageChange}
          disabled={generating}
        />
      </div>

      {/* Prompt */}
      <div className="space-y-1.5">
        <label
          htmlFor="avatar-prompt"
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Prompt
        </label>
        <textarea
          id="avatar-prompt"
          rows={4}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="A senior woman in a warm cardigan, friendly smile…"
          disabled={generating}
          className="flex w-full rounded border border-border bg-input text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/40 disabled:opacity-50 transition-colors resize-none"
        />
        <p className="text-[10px] text-muted-foreground/60">
          {referenceImage
            ? "Describe how to modify or pose the reference character."
            : "Describe the character to generate from scratch."}
        </p>
      </div>

      {/* Mode selector */}
      <div className="space-y-1.5">
        <label
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Generation Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["likeness_only", "likeness_environment"] as AvatarMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              disabled={generating}
              className={cn(
                "rounded-md border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                mode === m
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >
              <div className="font-semibold">
                {m === "likeness_only" ? "Likeness Only" : "Likeness + Environment"}
              </div>
              <div className="mt-0.5 text-[10px] opacity-70">
                {m === "likeness_only"
                  ? "4-image character sheet · white bg"
                  : "Character in photorealistic scenes"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div className="space-y-1.5">
        <label
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Aspect Ratio
        </label>
        <div className="flex gap-2">
          {(["16:9", "9:16"] as AspectRatio[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onAspectRatioChange(r)}
              disabled={generating}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                aspectRatio === r
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80"
              )}
            >
              {r}
              <span className="ml-1.5 text-[9px] opacity-60">
                {r === "16:9" ? "Landscape" : "Vertical"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating || !prompt.trim()}
        className={cn(
          "w-full rounded-md px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        )}
        style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em" }}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </span>
        ) : (
          "Generate Avatar"
        )}
      </button>
    </div>
  );
}
