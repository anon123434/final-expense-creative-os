"use server";

import { revalidatePath } from "next/cache";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getConceptsByCampaign } from "@/lib/repositories/concept-repo";
import { upsertScript } from "@/lib/repositories/script-repo";
import { generateScript } from "@/lib/services/script-generator";
import { generateVOScript } from "@/lib/services/vo-script-generator";
import { applyTransform } from "@/lib/services/script-transforms";
import type { ScriptTransform } from "@/lib/services/script-transforms";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";
import type { Script } from "@/types";
import { loadUserKeys } from "./_load-keys";

// ── Generate ───────────────────────────────────────────────────────────────

export async function generateScriptAction(
  campaignId: string,
  conceptId: string,
  durationSeconds: number = 30,
  customPrompt?: string
): Promise<{ success: true; script: Script; taggedScript: string; scriptProvider: string; voProvider: string } | FailResult> {
  try {
    await loadUserKeys();
    const [campaign, concepts] = await Promise.all([
      getCampaignById(campaignId),
      getConceptsByCampaign(campaignId),
    ]);

    if (!campaign) return { success: false, error: "Campaign not found." };

    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept) return { success: false, error: "Concept not found." };

    const generated = await generateScript({ campaign, concept, durationSeconds, customPrompt });

    // Also generate the ElevenLabs-tagged version in the same request
    let taggedScript = "";
    let voProvider = "none";
    try {
      const vo = await generateVOScript({
        campaign,
        hook: generated.hook,
        body: generated.body,
        cta: generated.cta,
      });
      taggedScript = vo.taggedScript;
      voProvider = vo.provider ?? "mock";
    } catch {
      // Non-fatal — ElevenLabs preview is optional
    }

    const script = await upsertScript({
      campaignId,
      conceptId,
      versionName: generated.versionName,
      hook: generated.hook,
      body: generated.body,
      cta: generated.cta,
      fullScript: generated.fullScript,
      durationSeconds: generated.durationSeconds,
      metadata: generated.metadata,
    });

    const scriptProvider = String(generated.metadata?.provider ?? "mock");
    revalidatePath(`/campaigns/${campaignId}/script`);
    return { success: true, script, taggedScript, scriptProvider, voProvider };
  } catch (err) {
    console.error("generateScriptAction:", err);
    return actionFail(err, "Failed to generate script.");
  }
}

// ── Transform ──────────────────────────────────────────────────────────────

export async function applyTransformAction(
  campaignId: string,
  conceptId: string,
  currentHook: string,
  currentBody: string,
  currentCta: string,
  transform: ScriptTransform
): Promise<{ success: true; script: Script } | FailResult> {
  try {
    await loadUserKeys();
    const campaign = await getCampaignById(campaignId);
    if (!campaign) return { success: false, error: "Campaign not found." };

    const transformed = await applyTransform({
      campaign,
      currentHook,
      currentBody,
      currentCta,
      transform,
    });

    const script = await upsertScript({
      campaignId,
      conceptId,
      versionName: `Transformed — ${transform}`,
      hook: transformed.hook,
      body: transformed.body,
      cta: transformed.cta,
      fullScript: transformed.fullScript,
      durationSeconds: null,
      metadata: transformed.metadata,
    });

    revalidatePath(`/campaigns/${campaignId}/script`);
    return { success: true, script };
  } catch (err) {
    console.error("applyTransformAction:", err);
    return actionFail(err, "Failed to apply transform.");
  }
}

// ── Save ───────────────────────────────────────────────────────────────────

export async function saveScriptAction(
  campaignId: string,
  conceptId: string,
  hook: string,
  body: string,
  cta: string
): Promise<{ success: true; script: Script } | FailResult> {
  try {
    const script = await upsertScript({
      campaignId,
      conceptId,
      versionName: "Manual edit",
      hook,
      body,
      cta,
      fullScript: `${hook}\n\n${body}\n\n${cta}`,
      durationSeconds: null,
      metadata: { savedAt: new Date().toISOString() },
    });

    revalidatePath(`/campaigns/${campaignId}/script`);
    return { success: true, script };
  } catch (err) {
    console.error("saveScriptAction:", err);
    return actionFail(err, "Failed to save script.");
  }
}
