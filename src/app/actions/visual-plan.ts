"use server";

import { revalidatePath } from "next/cache";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getAvatarById } from "@/lib/repositories/avatar-repo";
import { upsertVisualPlan } from "@/lib/repositories/visual-plan-repo";
import { generateVisualPlan } from "@/lib/services/visual-plan-generator";
import { generateSingleImage, uploadGeneratedImage } from "@/lib/services/gemini-image";
import { hasGeminiKey } from "@/lib/config/env";
import type { FailResult } from "@/lib/result";
import { actionFail, actionOk, type ActionResult } from "@/lib/result";
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

    const avatar = campaign.avatarId ? await getAvatarById(campaign.avatarId) : null;
    const avatarDescription = avatar?.expandedPrompt ?? avatar?.prompt ?? null;

    const generated = await generateVisualPlan({
      campaign,
      hook: script.hook ?? "",
      body: script.body ?? "",
      cta: script.cta ?? "",
      avatarDescription,
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

// ── Generate scene image ───────────────────────────────────────────────────

export async function generateSceneImageAction(
  campaignId: string,
  sceneIndex: number,
  imagePrompt: string,
  avatarImageUrls?: string[] | null
): Promise<ActionResult<{ url: string }>> {
  try {
    await loadUserKeys();

    if (!hasGeminiKey()) {
      return actionFail(null, "No Gemini API key configured. Add one in Settings.");
    }

    // Fetch all avatar images as base64 references for character consistency
    const refImages: string[] = [];
    if (avatarImageUrls?.length) {
      await Promise.all(
        avatarImageUrls.map(async (url) => {
          try {
            const res = await fetch(url);
            const buf = await res.arrayBuffer();
            const mimeType = res.headers.get("content-type") ?? "image/jpeg";
            refImages.push(`data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`);
          } catch {
            // Skip images that fail to fetch
          }
        })
      );
    }

    // Append identity instruction when reference images are provided
    const prompt = refImages.length > 0
      ? `${imagePrompt}\n\nIMPORTANT: Maintain the exact same face and identity from the reference image.`
      : imagePrompt;

    const { base64, mimeType } = await generateSingleImage(prompt, refImages.length ? refImages : null);
    const url = await uploadGeneratedImage(
      `generated/scenes/${campaignId}/${sceneIndex}.png`,
      base64,
      mimeType
    );

    return actionOk({ url });
  } catch (err) {
    console.error("generateSceneImageAction:", err);
    return actionFail(err, "Failed to generate scene image.");
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
