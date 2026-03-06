"use client";

import { useState } from "react";
import { Copy, Check, Mic, FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoScriptCardProps {
  taggedScript: string;
  voiceProfile: string;
  deliveryNotes: string;
  phoneticPhone: string | null;
}

export function VoScriptCard({
  taggedScript,
  voiceProfile,
  deliveryNotes,
  phoneticPhone,
}: VoScriptCardProps) {
  return (
    <div className="space-y-4">
      {/* Voice profile */}
      <MetaCard icon={Mic} label="Voice Profile" content={voiceProfile} copyable />

      {/* Phonetic phone */}
      {phoneticPhone && (
        <MetaCard
          icon={Info}
          label="Phone Number — Spoken As"
          content={phoneticPhone}
          copyable
          mono
        />
      )}

      {/* Tagged script */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            ElevenLabs Tagged Script
          </p>
          <CopyButton text={taggedScript} />
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <TaggedScriptRenderer script={taggedScript} />
        </div>
      </div>

      {/* Delivery notes */}
      <MetaCard icon={FileText} label="Delivery Notes" content={deliveryNotes} />
    </div>
  );
}

// ── Tagged script renderer ─────────────────────────────────────────────────

/**
 * Parses lines and renders emotion tags distinctly from spoken text.
 * Tags are lines that match <...> pattern.
 * Section headers are lines that start with ──.
 */
function TaggedScriptRenderer({ script }: { script: string }) {
  const lines = script.split("\n");

  return (
    <div className="space-y-1 font-mono text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("──")) {
          return (
            <p key={i} className="mt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground first:mt-0">
              {line.replace(/^──\s*/, "").replace(/\s*─+$/, "").trim()}
            </p>
          );
        }

        const tagMatch = line.match(/^<(.+)>$/);
        if (tagMatch) {
          return (
            <p key={i} className="text-xs font-medium italic text-primary/70">
              {"<"}{tagMatch[1]}{">"}
            </p>
          );
        }

        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }

        return (
          <p key={i} className="text-foreground">
            {line}
          </p>
        );
      })}
    </div>
  );
}

// ── Meta card ─────────────────────────────────────────────────────────────

interface MetaCardProps {
  icon: React.ElementType;
  label: string;
  content: string;
  copyable?: boolean;
  mono?: boolean;
}

function MetaCard({ icon: Icon, label, content, copyable, mono }: MetaCardProps) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        {copyable && <CopyButton text={content} />}
      </div>
      <p className={cn("text-sm leading-relaxed whitespace-pre-line", mono && "font-mono")}>
        {content}
      </p>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────

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
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
        "border hover:bg-accent transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        copied && "border-emerald-500 text-emerald-600"
      )}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}
