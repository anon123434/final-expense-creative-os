import { notFound } from "next/navigation";
import { getCampaignById, getTriggersByCampaign } from "@/lib/repositories/campaign-repo";
import { getAvatarById } from "@/lib/repositories/avatar-repo";
import { getConceptsByCampaign } from "@/lib/repositories/concept-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getVoScriptsByCampaign } from "@/lib/repositories/voiceover-repo";
import { getVisualPlansByCampaign } from "@/lib/repositories/visual-plan-repo";
import { getPromptsByCampaign } from "@/lib/repositories/prompt-repo";
import { getVersionsByCampaign } from "@/lib/repositories/version-repo";
import { getVariationsByCampaign } from "@/lib/repositories/variation-repo";
import { getPersonaByKey } from "@/lib/seed/personas";
import { getArchetypeByKey } from "@/lib/seed/archetypes";
import { getToneByKey } from "@/lib/seed/tones";
import { getTriggerByKey } from "@/lib/seed/triggers";
import { AvatarHero } from "@/components/campaign/overview/avatar-hero";
import { PrintOverviewButton } from "@/components/campaign/overview/print-button";
import { PipelineGrid } from "@/components/campaign/overview/pipeline-grid";
import type { PipelineStage } from "@/components/campaign/overview/pipeline-grid";
import { Check, X } from "lucide-react";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

function stageStatus(
  done: boolean,
  prevDone: boolean,
): "completed" | "active" | "locked" {
  if (done) return "completed";
  if (prevDone) return "active";
  return "locked";
}

export default async function OverviewTab({ params }: OverviewPageProps) {
  const { id } = await params;

  const [
    campaign,
    triggers,
    concepts,
    scripts,
    voScripts,
    visualPlans,
    prompts,
    versions,
    variations,
  ] = await Promise.all([
    getCampaignById(id),
    getTriggersByCampaign(id),
    getConceptsByCampaign(id),
    getScriptsByCampaign(id),
    getVoScriptsByCampaign(id),
    getVisualPlansByCampaign(id),
    getPromptsByCampaign(id),
    getVersionsByCampaign(id),
    getVariationsByCampaign(id),
  ]);

  if (!campaign) notFound();

  const avatar = campaign.avatarId ? await getAvatarById(campaign.avatarId) : null;
  const persona = campaign.personaId ? getPersonaByKey(campaign.personaId) : null;
  const archetype = campaign.archetypeId ? getArchetypeByKey(campaign.archetypeId) : null;
  const tone = campaign.emotionalTone ? getToneByKey(campaign.emotionalTone) : null;

  const includedTriggers = triggers
    .filter((t) => t.included)
    .map((t) => getTriggerByKey(t.triggerKey)?.label ?? t.triggerKey);
  const excludedTriggers = triggers
    .filter((t) => !t.included)
    .map((t) => getTriggerByKey(t.triggerKey)?.label ?? t.triggerKey);

  // Stage completion flags
  const hasAvatar = !!campaign.avatarId;
  const hasConcepts = concepts.length > 0;
  const hasScript = scripts.length > 0;
  const hasVoiceover = voScripts.length > 0;
  const hasVisualPlan = visualPlans.length > 0;
  const hasPrompts = prompts.length > 0;
  const hasVersions = versions.length > 0;
  const hasVariations = variations.length > 0;

  const stages: PipelineStage[] = [
    {
      id: "avatar",
      title: "Avatar",
      description: "Generate your spokesperson",
      iconName: "UserCircle",
      status: stageStatus(hasAvatar, true),
      href: "/avatars",
    },
    {
      id: "concepts",
      title: "Concepts",
      description: "Develop creative concepts",
      iconName: "Lightbulb",
      status: stageStatus(hasConcepts, hasAvatar),
      href: `/campaigns/${id}/concepts`,
    },
    {
      id: "script",
      title: "Script",
      description: "Write and finalize script",
      iconName: "FileText",
      status: stageStatus(hasScript, hasConcepts),
      href: `/campaigns/${id}/script`,
    },
    {
      id: "elevenlabs",
      title: "ElevenLabs",
      description: "Generate AI voiceover",
      iconName: "Mic",
      status: stageStatus(hasVoiceover, hasScript),
      href: `/campaigns/${id}/elevenlabs`,
    },
    {
      id: "visual-plan",
      title: "Visual Plan",
      description: "Plan scenes and shots",
      iconName: "Film",
      status: stageStatus(hasVisualPlan, hasVoiceover),
      href: `/campaigns/${id}/visual-plan`,
    },
    {
      id: "prompts",
      title: "Prompts",
      description: "Generate image prompts",
      iconName: "Sparkles",
      status: stageStatus(hasPrompts, hasVisualPlan),
      href: `/campaigns/${id}/prompts`,
    },
    {
      id: "versions",
      title: "Versions",
      description: "Manage campaign versions",
      iconName: "GitBranch",
      status: stageStatus(hasVersions, hasPrompts),
      href: `/campaigns/${id}/versions`,
    },
    {
      id: "creative-lab",
      title: "Creative Lab",
      description: "Render final creative assets",
      iconName: "Clapperboard",
      status: stageStatus(hasVariations, hasVersions),
      href: `/campaigns/${id}/creative-lab`,
    },
  ];

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const selectedConcept = concepts.find((c) => c.isSelected) ?? null;

  const hasBriefContent =
    persona ||
    archetype ||
    tone ||
    campaign.durationSeconds ||
    campaign.offerName ||
    campaign.phoneNumber ||
    campaign.deadlineText ||
    campaign.benefitAmount ||
    campaign.affordabilityText ||
    campaign.ctaStyle ||
    campaign.notes ||
    triggers.length > 0;

  return (
    <div className="space-y-6">
      {/* Print button — hidden in actual print output */}
      <div className="flex justify-end print:hidden">
        <PrintOverviewButton />
      </div>

      {/* Print-only: document header */}
      <div className="hidden print:block print-section mb-6 border-b border-gray-200 pb-4">
        <p className="font-mono-data text-[9px] uppercase tracking-widest text-gray-400 mb-1">Campaign Overview</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">{campaign.title}</h1>
        <p className="text-xs text-gray-400 mt-1">
          Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Hero avatar node */}
      <AvatarHero
        avatar={avatar}
        campaignId={id}
        completedCount={completedCount}
        totalStages={stages.length}
      />

      {/* Pipeline stage grid */}
      <PipelineGrid stages={stages} />

      {/* Campaign brief — compact, below pipeline */}
      {hasBriefContent && (
        <div className="pt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            <p className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">
              Campaign Brief
            </p>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Creative */}
            {(persona || archetype || tone || campaign.durationSeconds || campaign.offerName) && (
              <BriefCard label="Creative">
                {campaign.offerName && (
                  <BriefRow label="Offer" value={campaign.offerName} />
                )}
                {persona && <BriefRow label="Persona" value={persona.label} />}
                {archetype && (
                  <BriefRow label="Archetype" value={archetype.label} />
                )}
                {tone && <BriefRow label="Tone" value={tone.label} />}
                {campaign.durationSeconds && (
                  <BriefRow
                    label="Duration"
                    value={`${campaign.durationSeconds}s`}
                  />
                )}
              </BriefCard>
            )}

            {/* Production */}
            {(campaign.phoneNumber ||
              campaign.deadlineText ||
              campaign.benefitAmount ||
              campaign.affordabilityText ||
              campaign.ctaStyle) && (
              <BriefCard label="Production">
                {campaign.phoneNumber && (
                  <BriefRow label="Phone" value={campaign.phoneNumber} />
                )}
                {campaign.deadlineText && (
                  <BriefRow label="Deadline" value={campaign.deadlineText} />
                )}
                {campaign.benefitAmount && (
                  <BriefRow label="Benefit" value={campaign.benefitAmount} />
                )}
                {campaign.affordabilityText && (
                  <BriefRow
                    label="Affordability"
                    value={campaign.affordabilityText}
                  />
                )}
                {campaign.ctaStyle && (
                  <BriefRow label="CTA" value={campaign.ctaStyle} />
                )}
              </BriefCard>
            )}

            {/* Triggers */}
            {triggers.length > 0 && (
              <div className="rounded-xl border border-white/6 bg-[#0d0d0d] px-4 py-3 sm:col-span-2 print:hidden">
                <p className="mb-2.5 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">
                  Triggers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {includedTriggers.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/25 bg-[#00E676]/8 px-2 py-0.5 font-mono-data text-[10px] text-[#00E676]"
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                      {label}
                    </span>
                  ))}
                  {excludedTriggers.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2 py-0.5 font-mono-data text-[10px] text-muted-foreground/40 line-through"
                    >
                      <X className="h-2.5 w-2.5" strokeWidth={2} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {campaign.notes && (
              <div className="rounded-xl border border-white/6 bg-[#0d0d0d] px-4 py-3 sm:col-span-2">
                <p className="mb-2 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">
                  Notes
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {campaign.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ PRINT-ONLY SECTIONS ═══════════ */}

      {/* Selected Concept */}
      {selectedConcept && (
        <div className="hidden print:block print-section rounded-xl border border-gray-200 px-4 py-3">
          <p className="mb-2 font-mono-data text-[9px] uppercase tracking-widest text-gray-400">Selected Concept</p>
          <p className="font-display text-sm font-semibold text-gray-900">{selectedConcept.title}</p>
          {selectedConcept.oneSentenceAngle && (
            <p className="mt-1 text-xs text-gray-600">{selectedConcept.oneSentenceAngle}</p>
          )}
          {selectedConcept.hook && (
            <div className="mt-2 border-t border-gray-100 pt-2">
              <p className="font-mono-data text-[9px] uppercase tracking-wider text-gray-400">Hook</p>
              <p className="mt-0.5 text-xs text-gray-700">{selectedConcept.hook}</p>
            </div>
          )}
        </div>
      )}

      {/* Psychological Trigger Sequence */}
      {triggers.filter((t) => t.included).length > 0 && (
        <div className="hidden print:block print-section rounded-xl border border-gray-200 px-4 py-3">
          <p className="mb-2 font-mono-data text-[9px] uppercase tracking-widest text-gray-400">
            Psychological Trigger Sequence
          </p>
          <ol className="space-y-1.5">
            {triggers
              .filter((t) => t.included)
              .sort(
                (a, b) =>
                  (getTriggerByKey(a.triggerKey)?.masterOrder ?? 99) -
                  (getTriggerByKey(b.triggerKey)?.masterOrder ?? 99),
              )
              .map((t) => {
                const seed = getTriggerByKey(t.triggerKey);
                return seed ? (
                  <li key={t.triggerKey} className="flex gap-2 text-xs text-gray-700">
                    <span className="w-4 shrink-0 text-gray-400 tabular-nums">{seed.masterOrder}.</span>
                    <span>
                      <strong>{seed.label}</strong> — {seed.description}
                    </span>
                  </li>
                ) : null;
              })}
          </ol>
        </div>
      )}

      {/* Video Editing Guidelines */}
      <div className="hidden print:block print-section rounded-xl border border-gray-200 px-4 py-3">
        <p className="mb-2 font-mono-data text-[9px] uppercase tracking-widest text-gray-400">
          Video Editing Guidelines
        </p>
        <ul className="list-inside list-disc space-y-1 text-xs text-gray-700">
          <li>Use the Avatar IV video as the base layer</li>
          <li>Place b-roll footage on top of the avatar strategically to illustrate key points</li>
          <li>
            Use psychological editing techniques (cuts on beats, reaction shots) to improve viewer retention
          </li>
          <li>Emphasize important words with font animation / kinetic text</li>
          <li>Keep all edits clear and easy to follow — target audience is 55+ viewers</li>
          <li>Maintain strong pacing and visual variation throughout to hold attention</li>
        </ul>
      </div>

      {/* Export Requirements */}
      <div className="hidden print:block print-section rounded-xl border-2 border-gray-800 px-4 py-3">
        <p className="mb-2 font-mono-data text-[9px] uppercase tracking-widest text-gray-500">
          Export Requirements — REQUIRED
        </p>
        <table className="w-full text-xs text-gray-700">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="w-28 py-1 font-semibold">Duration</td>
              <td className="py-1">EXACTLY 59 seconds &nbsp;OR&nbsp; EXACTLY 1 minute 29 seconds (1:29)</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 font-semibold">Resolution</td>
              <td className="py-1">1080p</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 font-semibold">Bitrate</td>
              <td className="py-1">12,000 Kbps</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 font-semibold">Codec</td>
              <td className="py-1">H.264</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 font-semibold">Container</td>
              <td className="py-1">MP4</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold">Frame Rate</td>
              <td className="py-1">30fps</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Naming Convention */}
      <div className="hidden print:block print-section rounded-xl border border-gray-200 px-4 py-3">
        <p className="mb-2 font-mono-data text-[9px] uppercase tracking-widest text-gray-400">
          File Naming Convention
        </p>
        <p className="text-xs text-gray-700 mb-1">
          Format:{" "}
          <code className="rounded bg-gray-100 px-1 font-mono">Name-Platform-Last4</code>
        </p>
        <p className="text-xs text-gray-500">
          Example:{" "}
          <code className="rounded bg-gray-100 px-1 font-mono">Martha-Roku-0026.mp4</code>
        </p>
      </div>
    </div>
  );
}

function BriefCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-[#0d0d0d] px-4 py-3">
      <p className="mb-2.5 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-20 shrink-0 font-mono-data text-[9px] uppercase tracking-wider text-muted-foreground/50">
        {label}
      </span>
      <span className="text-[13px] text-foreground/75">{value}</span>
    </div>
  );
}
