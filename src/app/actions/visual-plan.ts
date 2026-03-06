"use server";

import { revalidatePath } from "next/cache";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { upsertVisualPlan } from "@/lib/repositories/visual-plan-repo";
import { generateVisualPlan } from "@/lib/services/visual-plan-generator";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";
import type { VisualPlan } from "@/types";
import type { SceneCard } from "@/types/scene";
import { loadUserKeys } from "./_load-keys";

// ── Generate ───────────────────────────────────────────────────────────────

export async function generateVisualPlanAction(
  campaignId: string,
  scriptId: string
): Promise<{ success: true; plan: VisualPlan } | FailResult> {
  try {
    await loadUserKeys();
    const [campaign, scripts] = await Promise.all([
      getCampaignById(campaignId),
      getScriptsByCampaign(campaignId),
    ]);

    if (!campaign) return { success: false, error: "Campaign not found." };

    const script = scripts.find((s) => s.id === scriptId);
    if (!script) return { success: false, error: "Script not found." };

    if (!script.hook && !script.body && !script.cta) {
      return { success: false, error: "Script has no content to build a visual plan from." };
    }

    const generated = await generateVisualPlan({
      campaign,
      hook: script.hook ?? "",
      body: script.body ?? "",
      cta: script.cta ?? "",
    });

    const plan = await upsertVisualPlan({
      campaignId,
      scriptId,
      overallDirection: generated.overallDirection,
      baseLayer: generated.baseLayer,
      aRoll: generated.aRollIdeas,
      bRoll: generated.bRollIdeas,
      scenes: generated.scenes,
    });

    revalidatePath(`/campaigns/${campaignId}/visual-plan`);
    return { success: true, plan };
  } catch (err) {
    console.error("generateVisualPlanAction:", err);
    return actionFail(err, "Failed to generate visual plan.");
  }
}

// ── Save (after manual edits) ──────────────────────────────────────────────

export async function saveVisualPlanAction(
  campaignId: string,
  scriptId: string,
  overallDirection: string,
  baseLayer: string,
  aRoll: string[],
  bRoll: string[],
  scenes: SceneCard[]
): Promise<{ success: true; plan: VisualPlan } | FailResult> {
  try {
    const plan = await upsertVisualPlan({
      campaignId,
      scriptId,
      overallDirection,
      baseLayer,
      aRoll,
      bRoll,
      scenes,
    });

    revalidatePath(`/campaigns/${campaignId}/visual-plan`);
    return { success: true, plan };
  } catch (err) {
    console.error("saveVisualPlanAction:", err);
    return actionFail(err, "Failed to save visual plan.");
  }
}
