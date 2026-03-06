"use server";

import { revalidatePath } from "next/cache";
import { buildSnapshot } from "@/lib/services/snapshot-builder";
import { saveVersion, getVersionById } from "@/lib/repositories/version-repo";
import { upsertScript } from "@/lib/repositories/script-repo";
import { upsertVoScript } from "@/lib/repositories/voiceover-repo";
import { upsertVisualPlan } from "@/lib/repositories/visual-plan-repo";
import { upsertPromptPack } from "@/lib/repositories/prompt-repo";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";
import type { CampaignVersion } from "@/types/version";

// ── Save ───────────────────────────────────────────────────────────────────

export async function saveVersionAction(
  campaignId: string,
  name: string
): Promise<{ success: true; version: CampaignVersion } | FailResult> {
  try {
    const snapshot = await buildSnapshot(campaignId);
    if (!snapshot) return { success: false, error: "Campaign not found." };

    const version = await saveVersion(campaignId, name.trim() || "Untitled Version", snapshot);

    revalidatePath(`/campaigns/${campaignId}/versions`);
    return { success: true, version };
  } catch (err) {
    console.error("saveVersionAction:", err);
    return actionFail(err, "Failed to save version.");
  }
}

// ── Restore ────────────────────────────────────────────────────────────────

export interface RestoreResult {
  restoredItems: string[];
}

export async function restoreVersionAction(
  campaignId: string,
  versionId: string
): Promise<{ success: true; result: RestoreResult } | FailResult> {
  try {
    const version = await getVersionById(campaignId, versionId);
    if (!version) return { success: false, error: "Version not found." };

    const { snapshot } = version;
    const restoredItems: string[] = [];

    // ── Script ─────────────────────────────────────────────────────────────
    let newScriptId: string | null = null;
    if (snapshot.script) {
      const s = snapshot.script;
      const restoredScript = await upsertScript({
        campaignId,
        conceptId: s.conceptId,
        versionName: `Restored — ${version.name}`,
        hook: s.hook,
        body: s.body,
        cta: s.cta,
        fullScript: s.fullScript,
        durationSeconds: s.durationSeconds,
        metadata: {
          ...(s.metadata ?? {}),
          restoredFromVersion: versionId,
          restoredFromVersionName: version.name,
        },
      });
      newScriptId = restoredScript.id;
      restoredItems.push("Script");
    }

    // ── Voiceover ──────────────────────────────────────────────────────────
    if (snapshot.voScript && newScriptId) {
      const v = snapshot.voScript;
      await upsertVoScript({
        campaignId,
        scriptId: newScriptId,
        taggedScript: v.taggedScript,
        voiceProfile: v.voiceProfile,
        deliveryNotes: v.deliveryNotes,
      });
      restoredItems.push("Voiceover script");
    }

    // ── Visual plan ────────────────────────────────────────────────────────
    let newVisualPlanId: string | null = null;
    if (snapshot.visualPlan && newScriptId) {
      const vp = snapshot.visualPlan;
      const restoredPlan = await upsertVisualPlan({
        campaignId,
        scriptId: newScriptId,
        overallDirection: vp.overallDirection,
        baseLayer: vp.baseLayer,
        aRoll: vp.aRoll,
        bRoll: vp.bRoll,
        scenes: vp.sceneBreakdown ?? [],
      });
      newVisualPlanId = restoredPlan.id;
      restoredItems.push(`Visual plan (${vp.sceneBreakdown?.length ?? 0} scenes)`);
    }

    // ── Prompt pack ────────────────────────────────────────────────────────
    if (snapshot.promptPack && newVisualPlanId) {
      const pp = snapshot.promptPack;
      await upsertPromptPack(campaignId, newVisualPlanId, {
        scenes: pp.scenes,
        voScript: pp.voScript,
      });
      restoredItems.push(`Prompt pack (${pp.scenes.length} scenes)`);
    }

    revalidatePath(`/campaigns/${campaignId}/script`);
    revalidatePath(`/campaigns/${campaignId}/elevenlabs`);
    revalidatePath(`/campaigns/${campaignId}/visual-plan`);
    revalidatePath(`/campaigns/${campaignId}/prompts`);
    revalidatePath(`/campaigns/${campaignId}/versions`);

    return { success: true, result: { restoredItems } };
  } catch (err) {
    console.error("restoreVersionAction:", err);
    return actionFail(err, "Failed to restore version.");
  }
}
