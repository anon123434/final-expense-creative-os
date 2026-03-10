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
  avatarId?: string | null,
  documentReferenceUrl?: string | null
): Promise<ActionResult<{ url: string }>> {
  try {
    await loadUserKeys();

    if (!hasGeminiKey()) {
      return actionFail(null, "No Gemini API key configured. Add one in Settings.");
    }

    // Fetch avatar images server-side to avoid passing large base64 data from client
    const refImages: string[] = [];
    if (avatarId) {
      const avatar = await getAvatarById(avatarId);
      const imageUrls = avatar?.imageUrls ?? [];
      await Promise.all(
        imageUrls.map(async (url) => {
          try {
            // Data URLs are already base64 — use directly; otherwise fetch from URL
            if (url.startsWith("data:")) {
              refImages.push(url);
            } else {
              const res = await fetch(url);
              const buf = await res.arrayBuffer();
              const mimeType = res.headers.get("content-type") ?? "image/jpeg";
              refImages.push(`data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`);
            }
          } catch {
            // Skip images that fail to fetch
          }
        })
      );
    }

    // Fetch document reference image if provided (must be first inlineData for Gemini grounding)
    let documentImage: string | null = null;
    if (documentReferenceUrl) {
      try {
        if (documentReferenceUrl.startsWith("data:")) {
          documentImage = documentReferenceUrl;
        } else {
          const res = await fetch(documentReferenceUrl);
          if (!res.ok) throw new Error(`Document fetch failed: ${res.status}`);
          const buf = await res.arrayBuffer();
          const mimeType = res.headers.get("content-type") ?? "image/jpeg";
          documentImage = `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`;
        }
      } catch {
        // If document fetch fails, proceed without it
        console.warn("[generateSceneImageAction] Failed to fetch document reference:", documentReferenceUrl);
      }
    }

    const documentAnchor = documentImage
      ? "CRITICAL: The first image provided is the EXACT document that must appear in this scene. Reproduce it photographically — same layout, same header, same dollar amount, same fields, same logo, same design. Do not invent or redesign any part of it. The check or letter in the generated image must be visually identical to the reference document image. Treat it as ground truth, not inspiration.\n\n"
      : "";
    const identityNote = refImages.length > 0
      ? "\n\nIMPORTANT: Maintain the exact same face and identity from the reference image."
      : "";
    const prompt = `${documentAnchor}${imagePrompt}${identityNote}`;

    const { base64, mimeType } = await generateSingleImage(prompt, refImages.length ? refImages : null, documentImage);
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

// ── Upload document asset ──────────────────────────────────────────────────

/**
 * Uploads a document reference image (check, approval letter, etc.) to Supabase Storage
 * and returns the public URL. The URL is stored on the SceneCard's documentReferenceUrl field.
 */
export async function uploadDocumentAssetAction(
  base64: string,
  mimeType: string,
  campaignId: string,
  sceneNumber: number
): Promise<ActionResult<{ url: string }>> {
  try {
    const url = await uploadGeneratedImage(
      `assets/documents/${campaignId}/${sceneNumber}.png`,
      base64,
      mimeType
    );
    return actionOk({ url });
  } catch (err) {
    console.error("uploadDocumentAssetAction:", err);
    return actionFail(err, "Failed to upload document asset.");
  }
}
