/**
 * Snapshot builder service.
 *
 * Assembles a full CampaignSnapshot by collecting the current state of all
 * campaign data from the repository layer. Call this before saving a version.
 *
 * The snapshot is a complete, self-contained JSON document — it can be
 * restored even if the originating rows have since been modified or deleted.
 */

import type { CampaignSnapshot } from "@/types/version";
import { getCampaignById, getTriggersByCampaign } from "@/lib/repositories/campaign-repo";
import { getConceptsByCampaign } from "@/lib/repositories/concept-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getLatestVoScriptForScript } from "@/lib/repositories/voiceover-repo";
import { getLatestVisualPlanForScript } from "@/lib/repositories/visual-plan-repo";
import { getPromptPackByVisualPlan } from "@/lib/repositories/prompt-repo";

export async function buildSnapshot(campaignId: string): Promise<CampaignSnapshot | null> {
  const [campaign, triggers, concepts, scripts] = await Promise.all([
    getCampaignById(campaignId),
    getTriggersByCampaign(campaignId),
    getConceptsByCampaign(campaignId),
    getScriptsByCampaign(campaignId),
  ]);

  if (!campaign) return null;

  // Most recent script is the one to snapshot
  const latestScript = scripts[0] ?? null;

  // Collect downstream data for that script in parallel
  const [voScript, visualPlan] = await Promise.all([
    latestScript
      ? getLatestVoScriptForScript(campaignId, latestScript.id)
      : Promise.resolve(null),
    latestScript
      ? getLatestVisualPlanForScript(campaignId, latestScript.id)
      : Promise.resolve(null),
  ]);

  const promptPack = visualPlan
    ? await getPromptPackByVisualPlan(campaignId, visualPlan.id)
    : null;

  const selectedConcept =
    concepts.find((c) => c.isSelected) ?? concepts[0] ?? null;

  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    campaign,
    triggers,
    selectedConcept,
    script: latestScript,
    voScript: voScript ?? null,
    visualPlan: visualPlan ?? null,
    promptPack: promptPack ?? null,
  };
}

// summarizeSnapshot lives in @/lib/utils/snapshot-utils (client-safe, no server imports).
