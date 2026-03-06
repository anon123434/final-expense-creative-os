/**
 * Campaign repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { Campaign, CampaignFormData, CampaignTrigger } from "@/types";
import type { CampaignRow, CampaignTriggerRow } from "@/types/database";
import { toCampaign, toCampaignTrigger } from "@/lib/mappers";
import { mockCampaignRows, mockCampaignTriggerRows } from "@/lib/mock/campaigns";
import { withSupabase, hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getCampaigns(_userId?: string): Promise<Campaign[]> {
  const data = await withSupabase<CampaignRow[]>("getCampaigns", (supabase) =>
    supabase.from("campaigns").select("*").order("updated_at", { ascending: false })
  );
  if (data) return data.map(toCampaign);

  await new Promise((r) => setTimeout(r, 200));
  return mockCampaignRows.map(toCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const data = await withSupabase<CampaignRow>("getCampaignById", (supabase) =>
    supabase.from("campaigns").select("*").eq("id", id).single()
  );
  if (data) return toCampaign(data);

  await new Promise((r) => setTimeout(r, 100));
  const row = mockCampaignRows.find((r) => r.id === id);
  return row ? toCampaign(row) : null;
}

export async function createCampaign(userId: string, formData: CampaignFormData): Promise<Campaign> {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data: row, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: userId,
          title: formData.title,
          offer_name: formData.offerName ?? null,
          persona_id: formData.personaId ?? null,
          archetype_id: formData.archetypeId ?? null,
          emotional_tone: formData.emotionalTone ?? null,
          duration_seconds: formData.durationSeconds ?? null,
          phone_number: formData.phoneNumber ?? null,
          phone_number_phonetic: formData.phoneNumberPhonetic ?? null,
          deadline_text: formData.deadlineText ?? null,
          benefit_amount: formData.benefitAmount ?? null,
          affordability_text: formData.affordabilityText ?? null,
          cta_style: formData.ctaStyle ?? null,
          notes: formData.notes ?? null,
        })
        .select()
        .single();

      if (!error && row) return toCampaign(row as CampaignRow);
      console.warn("[Supabase] createCampaign failed:", error?.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Supabase] createCampaign network/client error: ${msg}`);
    }
  }

  await new Promise((r) => setTimeout(r, 300));
  const now = new Date().toISOString();
  return {
    id: `camp-${Date.now()}`,
    userId,
    title: formData.title,
    offerName: formData.offerName ?? null,
    personaId: formData.personaId ?? null,
    archetypeId: formData.archetypeId ?? null,
    emotionalTone: formData.emotionalTone ?? null,
    durationSeconds: formData.durationSeconds ?? null,
    phoneNumber: formData.phoneNumber ?? null,
    phoneNumberPhonetic: formData.phoneNumberPhonetic ?? null,
    deadlineText: formData.deadlineText ?? null,
    benefitAmount: formData.benefitAmount ?? null,
    affordabilityText: formData.affordabilityText ?? null,
    ctaStyle: formData.ctaStyle ?? null,
    notes: formData.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function duplicateCampaign(id: string, userId: string): Promise<Campaign | null> {
  const source = await getCampaignById(id);
  if (!source) return null;

  const copy: CampaignFormData = {
    title: `${source.title} (Copy)`,
    offerName: source.offerName ?? undefined,
    personaId: source.personaId ?? undefined,
    archetypeId: source.archetypeId ?? undefined,
    emotionalTone: source.emotionalTone ?? undefined,
    durationSeconds: source.durationSeconds ?? undefined,
    phoneNumber: source.phoneNumber ?? undefined,
    phoneNumberPhonetic: source.phoneNumberPhonetic ?? undefined,
    deadlineText: source.deadlineText ?? undefined,
    benefitAmount: source.benefitAmount ?? undefined,
    affordabilityText: source.affordabilityText ?? undefined,
    ctaStyle: source.ctaStyle ?? undefined,
    notes: source.notes ?? undefined,
  };

  if (hasSupabaseConfig()) {
    return createCampaign(userId, copy);
  }

  await new Promise((r) => setTimeout(r, 200));
  const now = new Date().toISOString();
  return { ...source, id: `camp-${Date.now()}`, title: copy.title, createdAt: now, updatedAt: now };
}

export async function saveCampaignTriggers(
  campaignId: string,
  triggers: { triggerKey: string; included: boolean }[]
): Promise<void> {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await getSupabaseServerClient();
      await supabase.from("campaign_triggers").delete().eq("campaign_id", campaignId);
      if (triggers.length > 0) {
        const { error } = await supabase.from("campaign_triggers").insert(
          triggers.map((t) => ({
            campaign_id: campaignId,
            trigger_key: t.triggerKey,
            included: t.included,
          }))
        );
        if (error) console.warn("[Supabase] saveCampaignTriggers insert failed:", error.message);
      }
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Supabase] saveCampaignTriggers network/client error: ${msg}`);
    }
  }
  await new Promise((r) => setTimeout(r, 50));
}

export async function getTriggersByCampaign(campaignId: string): Promise<CampaignTrigger[]> {
  const data = await withSupabase<CampaignTriggerRow[]>("getTriggersByCampaign", (supabase) =>
    supabase.from("campaign_triggers").select("*").eq("campaign_id", campaignId)
  );
  if (data) return data.map(toCampaignTrigger);

  await new Promise((r) => setTimeout(r, 100));
  return mockCampaignTriggerRows
    .filter((r) => r.campaign_id === campaignId)
    .map(toCampaignTrigger);
}
