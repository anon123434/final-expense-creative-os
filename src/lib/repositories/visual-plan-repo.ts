/**
 * Visual plan repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { VisualPlan } from "@/types";
import type { SceneCard } from "@/types/scene";
import { toVisualPlan } from "@/lib/mappers";
import { mockVisualPlanRows } from "@/lib/mock/scene-mock";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getVisualPlansByCampaign(campaignId: string): Promise<VisualPlan[]> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("visual_plans")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    if (!error && data) return data.map(toVisualPlan);
    console.warn("Supabase getVisualPlansByCampaign failed, using mock:", error?.message);
  }
  await new Promise((r) => setTimeout(r, 100));
  return mockVisualPlanRows.filter((r) => r.campaign_id === campaignId).map(toVisualPlan);
}

export async function getLatestVisualPlanForScript(
  campaignId: string,
  scriptId: string
): Promise<VisualPlan | null> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("visual_plans")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("script_id", scriptId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!error && data) return toVisualPlan(data);
    if (error?.code !== "PGRST116") {
      console.warn("Supabase getLatestVisualPlanForScript failed:", error?.message);
    }
    return null;
  }
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
    console.warn("Supabase upsertVisualPlan failed, using mock:", error?.message);
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
