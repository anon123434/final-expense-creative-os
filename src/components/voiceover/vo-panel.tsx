"use client";

import { useState, useTransition } from "react";
import { Mic, AlertCircle, ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { useRef, useEffect } from "react";
import type { Script, VoiceoverScript } from "@/types";
import { VoScriptCard } from "./vo-script-card";
import { generateVOScriptAction, saveVOScriptAction } from "@/app/actions/voiceover";
import { toPhoneticPhone } from "@/lib/services/vo-script-generator";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "@/components/ui/provider-badge";

interface VoPanelProps {
  campaignId: string;
  phoneNumber: string | null;
  scripts: Script[];
  initialVo: VoiceoverScript | null;
  initialScriptId: string | null;
}

export function VoPanel({
  campaignId,
  phoneNumber,
  scripts,
  initialVo,
  initialScriptId,
}: VoPanelProps) {
  const [scriptId, setScriptId] = useState<string | null>(initialScriptId);
  const [vo, setVo] = useState<VoiceoverScript | null>(initialVo);
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();

  const phoneticPhone = phoneNumber ? toPhoneticPhone(phoneNumber) : null;

  function handleScriptChange(id: string) {
    setScriptId(id);
    setVo(null);
    setError(null);
  }

  function handleGenerate() {
    if (!scriptId) return;
    setError(null);
    startGenerating(async () => {
      const result = await generateVOScriptAction(campaignId, scriptId);
      if (result.success) {
        setVo(result.vo);
      } else {
        setError(result.error);
      }
    });
  }

  if (scripts.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={Mic}
          title="No scripts yet"
          description="Generate a script on the Script tab first, then come back here to create your ElevenLabs voiceover."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Script selector + generate button */}
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
              disabled={generating}
            />
          </div>
          <button
            type="button"
            disabled={!scriptId || generating}
            onClick={handleGenerate}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            )}
          >
            <Mic className={cn("h-4 w-4", generating && "animate-pulse")} />
            {generating ? "Generating…" : vo ? "Regenerate" : "Generate VO Script"}
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

      {/* Result */}
      {vo && !generating && (
        <VoScriptCard
          taggedScript={vo.taggedScript ?? ""}
          voiceProfile={vo.voiceProfile ?? ""}
          deliveryNotes={vo.deliveryNotes ?? ""}
          phoneticPhone={phoneticPhone}
        />
      )}

      {/* Generating skeleton */}
      {generating && (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-lg bg-muted" />
          <div className="h-56 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
        </div>
      )}

      {/* Select-script empty */}
      {!vo && !generating && scriptId && (
        <EmptyState
          icon={Mic}
          title="Ready to generate"
          description='Click "Generate VO Script" to create an ElevenLabs-ready tagged voiceover for this script.'
        />
      )}

      {!vo && !generating && !scriptId && (
        <EmptyState
          icon={Mic}
          title="Select a script above"
          description="Choose which script version to convert into a voiceover."
        />
      )}
    </div>
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
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected
            ? selected.versionName ?? `Script ${selected.id.slice(-6)}`
            : "Select a script…"}
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
                  onClick={() => {
                    onSelect(script.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent",
                    script.id === selectedId && "bg-accent/50"
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {script.id === selectedId ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium">
                      {script.versionName ?? `Script ${script.id.slice(-6)}`}
                    </span>
                    {script.hook && (
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {script.hook}
                      </span>
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

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <Icon className="mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
