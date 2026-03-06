/**
 * Concept repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { AdConcept } from "@/types";
import type { CreativeVariation } from "@/types/variation";
import type { ConceptInsert, ConceptRow } from "@/types/database";
import { toConcept } from "@/lib/mappers";
import { mockConceptRows } from "@/lib/mock/concept-mock";
import { withSupabase, hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getConceptsByCampaign(campaignId: string): Promise<AdConcept[]> {
  const data = await withSupabase("getConceptsByCampaign", (supabase) =>
    supabase
      .from("concepts")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
  );
  if (data) return (data as ConceptRow[]).map(toConcept);

  await new Promise((r) => setTimeout(r, 100));
  return mockConceptRows.filter((r) => r.campaign_id === campaignId).map(toConcept);
}

export async function createConcept(data: ConceptInsert): Promise<AdConcept> {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data: row, error } = await supabase
        .from("concepts")
        .insert(data)
        .select()
        .single();

      if (!error && row) return toConcept(row);
      console.warn("[Supabase] createConcept failed:", error?.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Supabase] createConcept network/client error: ${msg}`);
    }
  }

  await new Promise((r) => setTimeout(r, 200));
  const row = {
    id: `concept-${Date.now()}`,
    campaign_id: data.campaign_id,
    title: data.title,
    one_sentence_angle: data.one_sentence_angle ?? null,
    hook: data.hook ?? null,
    emotional_setup: data.emotional_setup ?? null,
    conflict: data.conflict ?? null,
    solution: data.solution ?? null,
    payoff: data.payoff ?? null,
    cta: data.cta ?? null,
    trigger_map: data.trigger_map ?? null,
    visual_world: data.visual_world ?? null,
    llm_raw: data.llm_raw ?? null,
    is_selected: data.is_selected ?? false,
    created_at: new Date().toISOString(),
  };
  mockConceptRows.push(row);
  return toConcept(row);
}

/**
 * Promotes a creative variation into a full concept row.
 * The variation's llm_raw records its origin for traceability.
 */
export async function promoteVariationToConcept(
  variation: CreativeVariation
): Promise<AdConcept> {
  const insert: ConceptInsert = {
    campaign_id: variation.campaignId,
    title: variation.title,
    one_sentence_angle: variation.oneSentenceAngle,
    hook: variation.hook,
    trigger_map: variation.triggerStack as Record<string, unknown>,
    visual_world: variation.sceneSummary.join("; "),
    llm_raw: {
      isVariation: true,
      variationNumber: variation.variationNumber,
      emotionalTone: variation.emotionalTone,
      whatChanged: variation.whatChanged,
      sceneSummary: variation.sceneSummary,
      imagePromptExamples: variation.imagePromptExamples,
      klingPromptExamples: variation.klingPromptExamples,
    } as Record<string, unknown>,
    is_selected: false,
  };

  if (hasSupabaseConfig()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from("concepts")
        .insert(insert)
        .select()
        .single();

      if (!error && data) return toConcept(data);
      console.warn("[Supabase] promoteVariationToConcept failed:", error?.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Supabase] promoteVariationToConcept network/client error: ${msg}`);
    }
  }

  return createConcept(insert);
}
