/**
 * Visual plan repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { VisualPlan } from "@/types";
import type { VisualPlanRow } from "@/types/database";
import type { SceneCard } from "@/types/scene";
import { toVisualPlan } from "@/lib/mappers";
import { mockVisualPlanRows } from "@/lib/mock/scene-mock";
import { withSupabase, hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getVisualPlansByCampaign(campaignId: string): Promise<VisualPlan[]> {
  const data = await withSupabase("getVisualPlansByCampaign", (supabase) =>
    supabase
      .from("visual_plans")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
  );
  if (data) return (data as VisualPlanRow[]).map(toVisualPlan);

  await new Promise((r) => setTimeout(r, 100));
  return mockVisualPlanRows.filter((r) => r.campaign_id === campaignId).map(toVisualPlan);
}

export async function getLatestVisualPlanForScript(
  campaignId: string,
  scriptId: string
): Promise<VisualPlan | null> {
  const data = await withSupabase("getLatestVisualPlanForScript", (supabase) =>
    supabase
      .from("visual_plans")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("script_id", scriptId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
  );
  if (data) return toVisualPlan(data as VisualPlanRow);

  await new Promise((r) => setTimeout(r, 100));
  const row = mockVisualPlanRows
    .filter((r) => r.campaign_id === campaignId && r.script_id === scriptId)
    .at(-1);
  return row ? toVisualPlan(row) : null;
}

export interface UpsertVisualPlanData {
  campaignId: string;
  scriptId: string;
  overallDirection: string | null;
  baseLayer: string | null;
  aRoll: string[] | null;
  bRoll: string[] | null;
  scenes: SceneCard[];
}

export async function upsertVisualPlan(data: UpsertVisualPlanData): Promise<VisualPlan> {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data: row, error } = await supabase
        .from("visual_plans")
        .insert({
          campaign_id: data.campaignId,
          script_id: data.scriptId,
          overall_direction: data.overallDirection,
          base_layer: data.baseLayer,
          a_roll: data.aRoll,
          b_roll: data.bRoll,
          scene_breakdown: data.scenes,
        })
        .select()
        .single();
      if (!error && row) return toVisualPlan(row);
      console.warn("[Supabase] upsertVisualPlan failed:", error?.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Supabase] upsertVisualPlan network/client error: ${msg}`);
    }
  }

  await new Promise((r) => setTimeout(r, 200));
  const mockRow = {
    id: `vp-${Date.now()}`,
    campaign_id: data.campaignId,
    script_id: data.scriptId,
    overall_direction: data.overallDirection,
    base_layer: data.baseLayer,
    a_roll: data.aRoll as unknown as Record<string, unknown>[] | null,
    b_roll: data.bRoll as unknown as Record<string, unknown>[] | null,
    scene_breakdown: data.scenes as unknown as Record<string, unknown>[] | null,
    created_at: new Date().toISOString(),
  };
  mockVisualPlanRows.push(mockRow);
  return toVisualPlan(mockRow);
}
