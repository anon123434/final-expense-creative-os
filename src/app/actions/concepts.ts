"use server";

import { revalidatePath } from "next/cache";
import { getCampaignById, getTriggersByCampaign } from "@/lib/repositories/campaign-repo";
import { createConcept, selectConcept, deleteConcept } from "@/lib/repositories/concept-repo";
import { generateConcepts } from "@/lib/services/concept-generator";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";
import type { AdConcept } from "@/types";
import { loadUserKeys } from "./_load-keys";

// ── Generate ───────────────────────────────────────────────────────────────

export async function generateConceptsAction(
  campaignId: string
): Promise<{ success: true; data: AdConcept[] } | FailResult> {
  try {
    await loadUserKeys();
    const [campaign, triggers] = await Promise.all([
      getCampaignById(campaignId),
      getTriggersByCampaign(campaignId),
    ]);

    if (!campaign) return { success: false, error: "Campaign not found." };

    const generated = await generateConcepts({ campaign, triggers });

    // Persist each generated concept, marking the first as selected
    const saved: AdConcept[] = [];
    for (let i = 0; i < generated.length; i++) {
      const g = generated[i];
      const concept = await createConcept({
        campaign_id: campaignId,
        title: g.title,
        one_sentence_angle: g.oneSentenceAngle,
        hook: g.hook,
        emotional_setup: g.emotionalSetup,
        conflict: g.conflict,
        solution: g.solution,
        payoff: g.payoff,
        cta: g.cta,
        trigger_map: g.triggerMap as Record<string, unknown>,
        visual_world: g.visualWorld,
        is_selected: i === 0,
      });
      saved.push(concept);
    }

    revalidatePath(`/campaigns/${campaignId}/concepts`);
    return { success: true, data: saved };
  } catch (err) {
    console.error("generateConceptsAction:", err);
    return actionFail(err, "Failed to generate concepts.");
  }
}

// ── Select ─────────────────────────────────────────────────────────────────

export async function selectConceptAction(
  campaignId: string,
  conceptId: string
): Promise<{ success: true } | FailResult> {
  try {
    await selectConcept(campaignId, conceptId);
    revalidatePath(`/campaigns/${campaignId}/concepts`);
    return { success: true };
  } catch (err) {
    console.error("selectConceptAction:", err);
    return actionFail(err, "Failed to select concept.");
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────

export async function deleteConceptAction(
  campaignId: string,
  conceptId: string
): Promise<{ success: true } | FailResult> {
  try {
    await deleteConcept(conceptId);
    revalidatePath(`/campaigns/${campaignId}/concepts`);
    return { success: true };
  } catch (err) {
    console.error("deleteConceptAction:", err);
    return actionFail(err, "Failed to delete concept.");
  }
}
