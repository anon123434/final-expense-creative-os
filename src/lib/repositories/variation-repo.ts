/**
 * Variation repository — data access layer for creative_variations table.
 * Tries Supabase first when env vars are present, falls back to in-memory mock.
 */

import type { CreativeVariation } from "@/types/variation";
import type { CreativeVariationInsert } from "@/types/database";
import { toCreativeVariation } from "@/lib/mappers";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

// In-memory fallback (resets on server restart — fine for dev without Supabase)
const mockVariations: CreativeVariation[] = [];

// ── Read ───────────────────────────────────────────────────────────────────

export async function getVariationsByCampaign(campaignId: string): Promise<CreativeVariation[]> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("creative_variations")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    if (!error && data) return data.map((row, i) => toCreativeVariation(row, i));
    console.warn("Supabase getVariationsByCampaign failed, using mock:", error?.message);
  }
  await new Promise((r) => setTimeout(r, 80));
  return mockVariations.filter((v) => v.campaignId === campaignId);
}

// ── Write ──────────────────────────────────────────────────────────────────

/**
 * Replaces all variations for a campaign with the new set.
 * Call after generating a fresh batch — old results are discarded.
 */
export async function saveVariations(variations: CreativeVariation[]): Promise<CreativeVariation[]> {
  if (variations.length === 0) return [];

  const campaignId = variations[0].campaignId;

  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    await supabase.from("creative_variations").delete().eq("campaign_id", campaignId);

    const inserts: CreativeVariationInsert[] = variations.map((v) => ({
      campaign_id: v.campaignId,
      title: v.title,
      hook: v.hook,
      one_sentence_angle: v.oneSentenceAngle,
      emotional_tone: v.emotionalTone,
      what_changed: v.whatChanged,
      trigger_stack: v.triggerStack,
      scene_summary: v.sceneSummary,
      image_prompt_examples: v.imagePromptExamples,
      kling_prompt_examples: v.klingPromptExamples,
      raw_output: { variationNumber: v.variationNumber } as Record<string, unknown>,
    }));

    const { data, error } = await supabase
      .from("creative_variations")
      .insert(inserts)
      .select();

    if (!error && data) return data.map((row, i) => toCreativeVariation(row, i));
    console.warn("Supabase saveVariations failed, using mock:", error?.message);
  }

  // Mock fallback
  await new Promise((r) => setTimeout(r, 200));
  const others = mockVariations.filter((v) => v.campaignId !== campaignId);
  const saved = variations.map((v) => ({
    ...v,
    id: `variation-${Date.now()}-${v.variationNumber}`,
    createdAt: new Date().toISOString(),
  }));
  mockVariations.splice(0, mockVariations.length, ...others, ...saved);
  return saved;
}
