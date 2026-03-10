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
import { getTriggerByKey } from "@/lib/seed/triggers";
import { getPersonaByKey } from "@/lib/seed/personas";
import { getArchetypeByKey } from "@/lib/seed/archetypes";
import { getToneByKey } from "@/lib/seed/tones";
import { AvatarHero } from "@/components/campaign/overview/avatar-hero";
import { PrintOverviewButton } from "@/components/campaign/overview/print-button";
import type { PrintData } from "@/components/campaign/overview/print-button";
import { PipelineGrid } from "@/components/campaign/overview/pipeline-grid";
import type { PipelineStage } from "@/components/campaign/overview/pipeline-grid";
import { CampaignBriefEditor } from "@/components/campaign/overview/brief-editor";
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
  const latestScript = scripts[0] ?? null;

  function cleanScript(text: string | null): string {
    if (!text) return "";
    return text.replace(/\[[^\]]*\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  const printScript = latestScript
    ? cleanScript(
        [latestScript.hook, latestScript.body, latestScript.cta].filter(Boolean).join("\n\n") ||
          latestScript.fullScript,
      )
    : null;

  const includedTriggerItems = triggers
    .filter((t) => t.included)
    .map((t) => getTriggerByKey(t.triggerKey))
    .filter(Boolean)
    .sort((a, b) => (a!.masterOrder ?? 99) - (b!.masterOrder ?? 99))
    .map((seed) => ({
      key: seed!.key,
      label: seed!.label,
      description: seed!.description,
      masterOrder: seed!.masterOrder ?? 0,
    }));

  const printData: PrintData = {
    filename: selectedConcept?.title ?? campaign.title,
    campaignTitle: campaign.title,
    generatedDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    avatarName: avatar?.name ?? null,
    durationSeconds: campaign.durationSeconds ?? null,
    offerName: campaign.offerName ?? null,
    personaLabel: persona?.label ?? null,
    archetypeLabel: archetype?.label ?? null,
    toneLabel: tone?.label ?? null,
    phoneNumber: campaign.phoneNumber ?? null,
    deadlineText: campaign.deadlineText ?? null,
    benefitAmount: campaign.benefitAmount ?? null,
    affordabilityText: campaign.affordabilityText ?? null,
    ctaStyle: campaign.ctaStyle ?? null,
    notes: campaign.notes ?? null,
    scriptText: printScript,
    scriptDuration: latestScript?.durationSeconds ?? null,
    scriptVersion: latestScript?.versionName ?? null,
    conceptTitle: selectedConcept?.title ?? null,
    triggers: includedTriggerItems,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PrintOverviewButton data={printData} />
      </div>

        <AvatarHero
          avatar={avatar}
          campaignId={id}
          completedCount={completedCount}
          totalStages={stages.length}
        />

        <PipelineGrid stages={stages} />

        <CampaignBriefEditor campaign={campaign} />

        {triggers.length > 0 && (
          <div className="rounded-xl border border-white/6 bg-[#0d0d0d] px-4 py-3">
            <p className="mb-2.5 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">Triggers</p>
            <div className="flex flex-wrap gap-1.5">
              {includedTriggers.map((label) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/25 bg-[#00E676]/8 px-2 py-0.5 font-mono-data text-[10px] text-[#00E676]">
                  <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                  {label}
                </span>
              ))}
              {excludedTriggers.map((label) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2 py-0.5 font-mono-data text-[10px] text-muted-foreground/40 line-through">
                  <X className="h-2.5 w-2.5" strokeWidth={2} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}


