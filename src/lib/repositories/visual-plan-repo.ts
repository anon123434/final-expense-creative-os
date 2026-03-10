/**
 * Visual plan repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { VisualPlan } from "@/types";
import type { SceneCard } from "@/types/scene";
import { toVisualPlan } from "@/lib/mappers";
import { mockVisualPlanRows } from "@/lib/mock/scene-mock";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export interface GeneratedAsset {
  planId: string;
  sceneNumber: number;
  sceneType: "A-roll" | "B-roll";
  shotIdea: string;
  imageUrl: string;
  videoUrl?: string | null;
  imagePrompt: string;
  klingPrompt: string;
  createdAt: string;
}

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
      console.warn("Supabase getLatestVisualPlanForScript failed, using mock:", error?.message);
    }
    // fall through to mock
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
    a_roll: data.aRoll,
    b_roll: data.bRoll,
    scene_breakdown: data.scenes as unknown as Record<string, unknown>[] | null,
    created_at: new Date().toISOString(),
  };
  mockVisualPlanRows.push(mockRow);
  return toVisualPlan(mockRow);
}

/**
 * Returns all generated scene images across every visual plan for the campaign.
 * Flattens scene_breakdown JSONB arrays, filters for scenes with a generatedImageUrl,
 * and sorts newest plan first.
 */
export async function getGeneratedAssetsForCampaign(campaignId: string): Promise<GeneratedAsset[]> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("visual_plans")
      .select("id, scene_breakdown, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const assets: GeneratedAsset[] = [];
      for (const plan of data) {
        const scenes = plan.scene_breakdown as Array<Record<string, unknown>> | null;
        if (!Array.isArray(scenes)) continue;
        for (const scene of scenes) {
          if (!scene.generatedImageUrl) continue;
          assets.push({
            planId: String(plan.id),
            sceneNumber: Number(scene.sceneNumber ?? 0),
            sceneType: (scene.sceneType === "A-roll" ? "A-roll" : "B-roll"),
            shotIdea: String(scene.shotIdea ?? ""),
            imageUrl: String(scene.generatedImageUrl),
            videoUrl: scene.generatedVideoUrl ? String(scene.generatedVideoUrl) : null,
            imagePrompt: String(scene.imagePrompt ?? ""),
            klingPrompt: String(scene.klingPrompt ?? ""),
            createdAt: String(plan.created_at),
          });
        }
      }
      return assets;
    }
    console.warn("Supabase getGeneratedAssetsForCampaign failed, using mock:", error?.message);
  }

  // Mock fallback — derive from in-memory mock rows
  const assets: GeneratedAsset[] = [];
  for (const plan of [...mockVisualPlanRows].reverse()) {
    if (plan.campaign_id !== campaignId) continue;
    const scenes = plan.scene_breakdown as Array<Record<string, unknown>> | null;
    if (!Array.isArray(scenes)) continue;
    for (const scene of scenes) {
      if (!scene.generatedImageUrl) continue;
      assets.push({
        planId: String(plan.id),
        sceneNumber: Number(scene.sceneNumber ?? 0),
        sceneType: (scene.sceneType === "A-roll" ? "A-roll" : "B-roll"),
        shotIdea: String(scene.shotIdea ?? ""),
        imageUrl: String(scene.generatedImageUrl),
        videoUrl: scene.generatedVideoUrl ? String(scene.generatedVideoUrl) : null,
        imagePrompt: String(scene.imagePrompt ?? ""),
        klingPrompt: String(scene.klingPrompt ?? ""),
        createdAt: String(plan.created_at),
      });
    }
  }
  return assets;
}
