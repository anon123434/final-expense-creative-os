"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { duplicateCampaign, createCampaign, saveCampaignTriggers } from "@/lib/repositories/campaign-repo";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";
import type { CampaignFormValues } from "@/lib/validation/campaign-schema";

// ── Create ─────────────────────────────────────────────────────────────────

export async function createCampaignAction(
  values: CampaignFormValues
): Promise<{ success: true; campaignId: string } | FailResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? "user-mock-001";

    const campaign = await createCampaign(userId, {
      title: values.title,
      offerName: values.offerName || undefined,
      personaId: values.personaId || undefined,
      archetypeId: values.archetypeId || undefined,
      emotionalTone: values.emotionalTone || undefined,
      durationSeconds: values.durationSeconds,
      phoneNumber: values.phoneNumber || undefined,
      deadlineText: values.deadlineText || undefined,
      benefitAmount: values.benefitAmount || undefined,
      affordabilityText: values.affordabilityText || undefined,
      ctaStyle: values.ctaStyle || undefined,
      notes: values.notes || undefined,
    });

    if (values.triggers && Object.keys(values.triggers).length > 0) {
      const triggerEntries = Object.entries(values.triggers).filter(
        ([, state]) => state !== "neutral"
      );
      if (triggerEntries.length > 0) {
        await saveCampaignTriggers(
          campaign.id,
          triggerEntries.map(([key, state]) => ({
            triggerKey: key,
            included: state === "include",
          }))
        );
      }
    }

    revalidatePath("/dashboard");
    return { success: true, campaignId: campaign.id };
  } catch (err) {
    console.error("createCampaignAction:", err);
    return actionFail(err, "Failed to create campaign. Please try again.");
  }
}

// ── Duplicate ──────────────────────────────────────────────────────────────

export async function duplicateCampaignAction(
  campaignId: string
): Promise<{ success: true } | FailResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? "user-mock-001";

    const result = await duplicateCampaign(campaignId, userId);
    if (!result) return { success: false, error: "Campaign not found or access denied." };

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("duplicateCampaignAction:", err);
    return actionFail(err, "Failed to duplicate campaign.");
  }
}
