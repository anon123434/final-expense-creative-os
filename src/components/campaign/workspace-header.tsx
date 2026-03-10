import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/types";
import { getPersonaByKey } from "@/lib/seed/personas";
import { getArchetypeByKey } from "@/lib/seed/archetypes";
import { getToneByKey } from "@/lib/seed/tones";

interface WorkspaceHeaderProps {
  campaign: Campaign;
}

interface MetaChipProps {
  label: string;
  value: string;
  className?: string;
}

function MetaChip({ label, value, className }: MetaChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs",
        className
      )}
    >
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

export function WorkspaceHeader({ campaign }: WorkspaceHeaderProps) {
  const persona = campaign.personaId
    ? getPersonaByKey(campaign.personaId)
    : null;
  const archetype = campaign.archetypeId
    ? getArchetypeByKey(campaign.archetypeId)
    : null;
  const tone = campaign.emotionalTone
    ? getToneByKey(campaign.emotionalTone)
    : null;

  return (
    <div className="border-b bg-background px-6 py-4 print:hidden">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Campaigns
      </Link>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">
            {campaign.title}
          </h1>
          {campaign.offerName && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {campaign.offerName}
            </p>
          )}
        </div>
      </div>

      {/* Metadata chips */}
      {(persona || archetype || tone || campaign.durationSeconds) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {persona && (
            <MetaChip label="Persona" value={persona.label} />
          )}
          {archetype && (
            <MetaChip label="Archetype" value={archetype.label} />
          )}
          {tone && (
            <MetaChip label="Tone" value={tone.label} />
          )}
          {campaign.durationSeconds && (
            <MetaChip label="Duration" value={`${campaign.durationSeconds}s`} />
          )}
          {campaign.phoneNumber && (
            <MetaChip label="Phone" value={campaign.phoneNumber} />
          )}
          {campaign.benefitAmount && (
            <MetaChip label="Benefit" value={campaign.benefitAmount} />
          )}
        </div>
      )}
    </div>
  );
}
