"use server";

import { revalidatePath } from "next/cache";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getLatestVisualPlanForScript } from "@/lib/repositories/visual-plan-repo";
import { getLatestVoScriptForScript } from "@/lib/repositories/voiceover-repo";
import { upsertPromptPack } from "@/lib/repositories/prompt-repo";
import { generateScenePromptPack } from "@/lib/services/scene-prompt-generator";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";
import type { ScenePromptPack, ScenePrompt } from "@/types/prompt";
import { loadUserKeys } from "./_load-keys";

// ── Generate ───────────────────────────────────────────────────────────────

export async function generatePromptPackAction(
  campaignId: string,
  scriptId: string
): Promise<{ success: true; pack: ScenePromptPack } | FailResult> {
  try {
    await loadUserKeys();
    const [campaign, scripts] = await Promise.all([
      getCampaignById(campaignId),
      getScriptsByCampaign(campaignId),
    ]);

    if (!campaign) return { success: false, error: "Campaign not found." };

    const script = scripts.find((s) => s.id === scriptId);
    if (!script) return { success: false, error: "Script not found." };

    const visualPlan = await getLatestVisualPlanForScript(campaignId, scriptId);
    if (!visualPlan?.sceneBreakdown?.length) {
      return {
        success: false,
        error: "No visual plan found for this script. Generate a visual plan first.",
      };
    }

    const voRecord = await getLatestVoScriptForScript(campaignId, scriptId);

    const generated = await generateScenePromptPack({
      campaign,
      script,
      scenes: visualPlan.sceneBreakdown,
      existingVoScript: voRecord?.taggedScript ?? null,
    });

    const pack = await upsertPromptPack(campaignId, visualPlan.id, generated);

    revalidatePath(`/campaigns/${campaignId}/prompts`);
    return { success: true, pack };
  } catch (err) {
    console.error("generatePromptPackAction:", err);
    return actionFail(err, "Failed to generate prompt pack.");
  }
}

// ── Save ───────────────────────────────────────────────────────────────────

export async function savePromptPackAction(
  campaignId: string,
  visualPlanId: string,
  scenes: ScenePrompt[],
  voScript: string
): Promise<{ success: true; pack: ScenePromptPack } | FailResult> {
  try {
    const pack = await upsertPromptPack(campaignId, visualPlanId, { scenes, voScript });
    revalidatePath(`/campaigns/${campaignId}/prompts`);
    return { success: true, pack };
  } catch (err) {
    console.error("savePromptPackAction:", err);
    return actionFail(err, "Failed to save prompt pack.");
  }
}

// ── Regenerate single scene ────────────────────────────────────────────────

export async function regenerateScenePromptAction(
  campaignId: string,
  scriptId: string,
  sceneNumber: number
): Promise<{ success: true; scene: ScenePrompt } | FailResult> {
  try {
    await loadUserKeys();
    const [campaign, scripts] = await Promise.all([
      getCampaignById(campaignId),
      getScriptsByCampaign(campaignId),
    ]);

    if (!campaign) return { success: false, error: "Campaign not found." };

    const script = scripts.find((s) => s.id === scriptId);
    if (!script) return { success: false, error: "Script not found." };

    const visualPlan = await getLatestVisualPlanForScript(campaignId, scriptId);
    const sourceScene = visualPlan?.sceneBreakdown?.find(
      (s) => s.sceneNumber === sceneNumber
    );
    if (!sourceScene) return { success: false, error: "Scene not found in visual plan." };

    const result = await generateScenePromptPack({
      campaign,
      script,
      scenes: [sourceScene],
      existingVoScript: null,
    });

    const scene = result.scenes[0];
    if (!scene) return { success: false, error: "Scene generation failed." };

    return { success: true, scene };
  } catch (err) {
    console.error("regenerateScenePromptAction:", err);
    return actionFail(err, "Failed to regenerate scene prompt.");
  }
}
