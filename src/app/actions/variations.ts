"use server";

import { getCampaignById, getTriggersByCampaign } from "@/lib/repositories/campaign-repo";
import { getConceptsByCampaign, promoteVariationToConcept } from "@/lib/repositories/concept-repo";
import { saveVariations } from "@/lib/repositories/variation-repo";
import { upsertScript } from "@/lib/repositories/script-repo";
import { generateCreativeVariations } from "@/lib/services/variation-generator";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";
import type { CreativeVariation } from "@/types/variation";
import type { AdConcept } from "@/types";
import { loadUserKeys } from "./_load-keys";

// ── Generate ───────────────────────────────────────────────────────────────

export async function generateVariationsAction(
  campaignId: string
): Promise<{ success: true; data: CreativeVariation[] } | FailResult> {
  try {
    await loadUserKeys();
    const [campaign, triggers, concepts] = await Promise.all([
      getCampaignById(campaignId),
      getTriggersByCampaign(campaignId),
      getConceptsByCampaign(campaignId),
    ]);

    if (!campaign) return { success: false, error: "Campaign not found." };

    const selectedConcept = concepts.find((c) => c.isSelected) ?? concepts[0] ?? null;

    const variations = await generateCreativeVariations({
      campaign,
      triggers,
      selectedConcept,
    });

    const saved = await saveVariations(variations);
    return { success: true, data: saved };
  } catch (err) {
    console.error("generateVariationsAction:", err);
    return actionFail(err, "Failed to generate variations.");
  }
}

// ── Save as concept ────────────────────────────────────────────────────────

export async function saveVariationAsConceptAction(
  variation: CreativeVariation
): Promise<{ success: true; data: AdConcept } | FailResult> {
  try {
    const concept = await promoteVariationToConcept(variation);
    return { success: true, data: concept };
  } catch (err) {
    console.error("saveVariationAsConceptAction:", err);
    return actionFail(err, "Failed to save variation as concept.");
  }
}

// ── Generate script from variation ────────────────────────────────────────

export async function generateScriptFromVariationAction(
  variation: CreativeVariation
): Promise<{ success: true; data: { conceptId: string; scriptId: string } } | FailResult> {
  try {
    const concept = await promoteVariationToConcept(variation);

    const script = await upsertScript({
      campaignId: variation.campaignId,
      conceptId: concept.id,
      versionName: `From variation: ${variation.title}`,
      hook: variation.hook,
      body: variation.sceneSummary.join("\n\n"),
      cta: `Call now — ${variation.triggerStack["urgency"] ? "limited time." : "coverage available."}`,
      durationSeconds: null,
      fullScript: null,
      metadata: {
        generatedFromVariation: true,
        variationNumber: variation.variationNumber,
        emotionalTone: variation.emotionalTone,
      },
    });

    return { success: true, data: { conceptId: concept.id, scriptId: script.id } };
  } catch (err) {
    console.error("generateScriptFromVariationAction:", err);
    return actionFail(err, "Failed to generate script from variation.");
  }
}
