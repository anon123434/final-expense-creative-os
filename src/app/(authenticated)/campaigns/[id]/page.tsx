import { notFound } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { TabPlaceholder } from "@/components/campaign/tab-placeholder";
import { getCampaignById, getTriggersByCampaign } from "@/lib/repositories/campaign-repo";
import { getPersonaByKey } from "@/lib/seed/personas";
import { getArchetypeByKey } from "@/lib/seed/archetypes";
import { getToneByKey } from "@/lib/seed/tones";
import { getTriggerByKey } from "@/lib/seed/triggers";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 border-b px-4 py-3 last:border-0">
      <span className="w-44 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default async function OverviewTab({ params }: OverviewPageProps) {
  const { id } = await params;
  const [campaign, triggers] = await Promise.all([
    getCampaignById(id),
    getTriggersByCampaign(id),
  ]);

  if (!campaign) notFound();

  const persona = campaign.personaId ? getPersonaByKey(campaign.personaId) : null;
  const archetype = campaign.archetypeId ? getArchetypeByKey(campaign.archetypeId) : null;
  const tone = campaign.emotionalTone ? getToneByKey(campaign.emotionalTone) : null;

  const includedTriggers = triggers
    .filter((t) => t.included)
    .map((t) => getTriggerByKey(t.triggerKey)?.label ?? t.triggerKey);
  const excludedTriggers = triggers
    .filter((t) => !t.included)
    .map((t) => getTriggerByKey(t.triggerKey)?.label ?? t.triggerKey);

  const hasAnyContent =
    persona ||
    archetype ||
    tone ||
    campaign.durationSeconds ||
    campaign.phoneNumber ||
    campaign.deadlineText ||
    campaign.benefitAmount ||
    campaign.affordabilityText ||
    campaign.notes ||
    triggers.length > 0;

  if (!hasAnyContent) {
    return (
      <TabPlaceholder
        icon={LayoutDashboard}
        title="Campaign overview"
        description="Once you fill in your campaign brief, all details will appear here."
        hint="Edit the campaign to add creative direction and production details."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Creative Brief */}
      {(persona || archetype || tone || campaign.durationSeconds || campaign.offerName) && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Creative Brief
          </h2>
          <div className="rounded-lg border">
            <DetailRow label="Offer" value={campaign.offerName} />
            <DetailRow label="Persona" value={persona?.label ?? campaign.personaId} />
            <DetailRow
              label="Archetype"
              value={archetype ? `${archetype.label} — ${archetype.narrativeArc}` : campaign.archetypeId}
            />
            <DetailRow label="Tone" value={tone?.label ?? campaign.emotionalTone} />
            <DetailRow
              label="Duration"
              value={campaign.durationSeconds ? `${campaign.durationSeconds} seconds` : null}
            />
          </div>
        </section>
      )}

      {/* Production Details */}
      {(campaign.phoneNumber || campaign.deadlineText || campaign.benefitAmount || campaign.affordabilityText || campaign.ctaStyle) && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Production Details
          </h2>
          <div className="rounded-lg border">
            <DetailRow label="Phone Number" value={campaign.phoneNumber} />
            <DetailRow label="Deadline" value={campaign.deadlineText} />
            <DetailRow label="Benefit Amount" value={campaign.benefitAmount} />
            <DetailRow label="Affordability Anchor" value={campaign.affordabilityText} />
            <DetailRow label="CTA Style" value={campaign.ctaStyle} />
          </div>
        </section>
      )}

      {/* Triggers */}
      {triggers.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Psychological Triggers
          </h2>
          <div className="space-y-2">
            {includedTriggers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {includedTriggers.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border border-emerald-500 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                  >
                    ✓ {label}
                  </span>
                ))}
              </div>
            )}
            {excludedTriggers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {excludedTriggers.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border border-destructive/50 bg-destructive/5 px-2.5 py-0.5 text-xs font-semibold text-destructive"
                  >
                    ✕ {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Notes */}
      {campaign.notes && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </h2>
          <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
            {campaign.notes}
          </div>
        </section>
      )}
    </div>
  );
}
