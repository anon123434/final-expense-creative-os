/**
 * Campaign repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { Campaign, CampaignFormData, CampaignTrigger } from "@/types";
import type { CampaignRow } from "@/types/database";
import { toCampaign, toCampaignTrigger } from "@/lib/mappers";
import { mockCampaignRows, mockCampaignTriggerRows } from "@/lib/mock/campaigns";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getCampaigns(userId: string): Promise<Campaign[]> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (!error && data) return (data as CampaignRow[]).map(toCampaign);
    console.warn("Supabase getCampaigns failed, using mock:", error?.message);
  }

  await new Promise((r) => setTimeout(r, 200));
  return mockCampaignRows.filter((r) => r.user_id === userId).map(toCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) return toCampaign(data as CampaignRow);
    if (error?.code !== "PGRST116") {
      console.warn("Supabase getCampaignById failed, using mock:", error?.message);
    }
  }

  await new Promise((r) => setTimeout(r, 100));
  const row = mockCampaignRows.find((r) => r.id === id);
  return row ? toCampaign(row) : null;
}

export async function createCampaign(userId: string, data: CampaignFormData): Promise<Campaign> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        title: data.title,
        offer_name: data.offerName ?? null,
        persona_id: data.personaId ?? null,
        archetype_id: data.archetypeId ?? null,
        emotional_tone: data.emotionalTone ?? null,
        duration_seconds: data.durationSeconds ?? null,
        phone_number: data.phoneNumber ?? null,
        phone_number_phonetic: data.phoneNumberPhonetic ?? null,
        deadline_text: data.deadlineText ?? null,
        benefit_amount: data.benefitAmount ?? null,
        affordability_text: data.affordabilityText ?? null,
        cta_style: data.ctaStyle ?? null,
        notes: data.notes ?? null,
        persona_image_url: data.personaImageUrl ?? null,
      })
      .select()
      .single();

    if (!error && row) return toCampaign(row as CampaignRow);
    console.warn("Supabase createCampaign failed, using mock:", error?.message);
  }

  await new Promise((r) => setTimeout(r, 300));
  const now = new Date().toISOString();
  const mockRow: CampaignRow = {
    id: `camp-${Date.now()}`,
    user_id: userId,
    title: data.title,
    offer_name: data.offerName ?? null,
    persona_id: data.personaId ?? null,
    archetype_id: data.archetypeId ?? null,
    emotional_tone: data.emotionalTone ?? null,
    duration_seconds: data.durationSeconds ?? null,
    phone_number: data.phoneNumber ?? null,
    phone_number_phonetic: data.phoneNumberPhonetic ?? null,
    deadline_text: data.deadlineText ?? null,
    benefit_amount: data.benefitAmount ?? null,
    affordability_text: data.affordabilityText ?? null,
    cta_style: data.ctaStyle ?? null,
    notes: data.notes ?? null,
    persona_image_url: data.personaImageUrl ?? null,
    avatar_id: null,
    created_at: now,
    updated_at: now,
  };
  mockCampaignRows.push(mockRow);
  return toCampaign(mockRow);
}

export async function updateCampaign(id: string, data: Partial<CampaignFormData>): Promise<Campaign> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("campaigns")
      .update({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.offerName !== undefined && { offer_name: data.offerName || null }),
        ...(data.personaId !== undefined && { persona_id: data.personaId || null }),
        ...(data.archetypeId !== undefined && { archetype_id: data.archetypeId || null }),
        ...(data.emotionalTone !== undefined && { emotional_tone: data.emotionalTone || null }),
        ...(data.durationSeconds !== undefined && { duration_seconds: data.durationSeconds || null }),
        ...(data.phoneNumber !== undefined && { phone_number: data.phoneNumber || null }),
        ...(data.phoneNumberPhonetic !== undefined && { phone_number_phonetic: data.phoneNumberPhonetic || null }),
        ...(data.deadlineText !== undefined && { deadline_text: data.deadlineText || null }),
        ...(data.benefitAmount !== undefined && { benefit_amount: data.benefitAmount || null }),
        ...(data.affordabilityText !== undefined && { affordability_text: data.affordabilityText || null }),
        ...(data.ctaStyle !== undefined && { cta_style: data.ctaStyle || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      })
      .eq("id", id)
      .select()
      .single();
    if (!error && row) return toCampaign(row as CampaignRow);
    throw new Error(error?.message ?? "Failed to update campaign.");
  }
  // Mock fallback
  const idx = mockCampaignRows.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Campaign not found.");
  const existing = mockCampaignRows[idx];
  mockCampaignRows[idx] = {
    ...existing,
    ...(data.title !== undefined && { title: data.title }),
    ...(data.offerName !== undefined && { offer_name: data.offerName || null }),
    ...(data.personaId !== undefined && { persona_id: data.personaId || null }),
    ...(data.archetypeId !== undefined && { archetype_id: data.archetypeId || null }),
    ...(data.emotionalTone !== undefined && { emotional_tone: data.emotionalTone || null }),
    ...(data.durationSeconds !== undefined && { duration_seconds: data.durationSeconds || null }),
    ...(data.phoneNumber !== undefined && { phone_number: data.phoneNumber || null }),
    ...(data.phoneNumberPhonetic !== undefined && { phone_number_phonetic: data.phoneNumberPhonetic || null }),
    ...(data.deadlineText !== undefined && { deadline_text: data.deadlineText || null }),
    ...(data.benefitAmount !== undefined && { benefit_amount: data.benefitAmount || null }),
    ...(data.affordabilityText !== undefined && { affordability_text: data.affordabilityText || null }),
    ...(data.ctaStyle !== undefined && { cta_style: data.ctaStyle || null }),
    ...(data.notes !== undefined && { notes: data.notes || null }),
    updated_at: new Date().toISOString(),
  };
  return toCampaign(mockCampaignRows[idx]);
}

export async function duplicateCampaign(id: string, userId: string): Promise<Campaign | null> {
  const source = await getCampaignById(id);
  if (!source || source.userId !== userId) return null;

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
      if (error) console.warn("Supabase saveCampaignTriggers insert failed:", error.message);
    }
    return;
  }
  await new Promise((r) => setTimeout(r, 50));
}

export async function getTriggersByCampaign(campaignId: string): Promise<CampaignTrigger[]> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_triggers")
      .select("*")
      .eq("campaign_id", campaignId);

    if (!error && data) return data.map(toCampaignTrigger);
    console.warn("Supabase getTriggersByCampaign failed, using mock:", error?.message);
  }

  await new Promise((r) => setTimeout(r, 100));
  return mockCampaignTriggerRows
    .filter((r) => r.campaign_id === campaignId)
    .map(toCampaignTrigger);
}
