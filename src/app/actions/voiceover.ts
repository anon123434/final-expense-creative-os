"use server";

import { revalidatePath } from "next/cache";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { upsertVoScript } from "@/lib/repositories/voiceover-repo";
import { generateVOScript } from "@/lib/services/vo-script-generator";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";
import type { VoiceoverScript } from "@/types";
import { loadUserKeys } from "./_load-keys";

// ── Generate ───────────────────────────────────────────────────────────────

export async function generateVOScriptAction(
  campaignId: string,
  scriptId: string
): Promise<{ success: true; vo: VoiceoverScript } | FailResult> {
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
      return { success: false, error: "Script has no content to convert." };
    }

    const generated = await generateVOScript({
      campaign,
      hook: script.hook ?? "",
      body: script.body ?? "",
      cta: script.cta ?? "",
    });

    const vo = await upsertVoScript({
      campaignId,
      scriptId,
      taggedScript: generated.taggedScript,
      voiceProfile: generated.voiceProfile,
      deliveryNotes: generated.deliveryNotes,
    });

    revalidatePath(`/campaigns/${campaignId}/elevenlabs`);
    return { success: true, vo };
  } catch (err) {
    console.error("generateVOScriptAction:", err);
    return actionFail(err, "Failed to generate voiceover script.");
  }
}

// ── Save (manual edit) ─────────────────────────────────────────────────────

export async function saveVOScriptAction(
  campaignId: string,
  scriptId: string,
  taggedScript: string,
  voiceProfile: string,
  deliveryNotes: string
): Promise<{ success: true; vo: VoiceoverScript } | FailResult> {
  try {
    const vo = await upsertVoScript({
      campaignId,
      scriptId,
      taggedScript,
      voiceProfile,
      deliveryNotes,
    });

    revalidatePath(`/campaigns/${campaignId}/elevenlabs`);
    return { success: true, vo };
  } catch (err) {
    console.error("saveVOScriptAction:", err);
    return actionFail(err, "Failed to save voiceover script.");
  }
}
