/**
 * Prompt repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 *
 * Storage model: one DB row per (scene × prompt_type).
 *   scene_name  = "scene-1", "scene-2", … | "vo_script"
 *   prompt_type = "image" | "kling" | "vo_script"
 *   metadata    = { sceneNumber, sceneType, lineReference, setting, emotion }
 */

import type { ImagePrompt, ScenePrompt, ScenePromptPack } from "@/types/prompt";
import type { PromptRow } from "@/types/database";
import { toImagePrompt } from "@/lib/mappers";
import { mockPromptRows } from "@/lib/mock/prompt-mock";
import { withSupabase, hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

// ── Read ───────────────────────────────────────────────────────────────────

export async function getPromptsByCampaign(campaignId: string): Promise<ImagePrompt[]> {
  const data = await withSupabase("getPromptsByCampaign", (supabase) =>
    supabase
      .from("prompts")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
  );
  if (data) return (data as PromptRow[]).map(toImagePrompt);

  await new Promise((r) => setTimeout(r, 100));
  return mockPromptRows.filter((r) => r.campaign_id === campaignId).map(toImagePrompt);
}

/**
 * Reconstruct a ScenePromptPack from flat DB rows.
 * Returns null if no rows exist for this visual plan.
 */
export async function getPromptPackByVisualPlan(
  campaignId: string,
  visualPlanId: string
): Promise<ScenePromptPack | null> {
  let rows: ImagePrompt[];

  const data = await withSupabase("getPromptPackByVisualPlan", (supabase) =>
    supabase
      .from("prompts")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("visual_plan_id", visualPlanId)
      .order("scene_name")
  );

  if (data && (data as unknown[]).length > 0) {
    rows = (data as PromptRow[]).map(toImagePrompt);
  } else if (data) {
    // Query succeeded but no rows — not an error
    return null;
  } else {
    // Supabase unavailable — use mock
    await new Promise((r) => setTimeout(r, 100));
    const raw = mockPromptRows
      .filter((r) => r.campaign_id === campaignId && r.visual_plan_id === visualPlanId)
      .map(toImagePrompt);
    if (raw.length === 0) return null;
    rows = raw;
  }

  return rowsToPromptPack(visualPlanId, rows);
}

function rowsToPromptPack(visualPlanId: string, rows: ImagePrompt[]): ScenePromptPack {
  const voRow = rows.find((r) => r.promptType === "vo_script");
  const sceneRows = rows.filter((r) => r.promptType !== "vo_script");

  const sceneMap = new Map<string, Partial<ScenePrompt>>();

  for (const row of sceneRows) {
    const key = row.sceneName ?? "";
    if (!sceneMap.has(key)) {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      sceneMap.set(key, {
        sceneNumber: (meta.sceneNumber as number) ?? 0,
        lineReference: (meta.lineReference as string) ?? "",
        sceneType: ((meta.sceneType as string) ?? "B-roll") as "A-roll" | "B-roll",
        setting: (meta.setting as string) ?? "",
        emotion: (meta.emotion as string) ?? "",
        imagePrompt: "",
        klingPrompt: "",
      });
    }
    const entry = sceneMap.get(key)!;
    if (row.promptType === "image") entry.imagePrompt = row.promptText ?? "";
    if (row.promptType === "kling") entry.klingPrompt = row.promptText ?? "";
  }

  const scenes = Array.from(sceneMap.values())
    .sort((a, b) => (a.sceneNumber ?? 0) - (b.sceneNumber ?? 0)) as ScenePrompt[];

  return { visualPlanId, scenes, voScript: voRow?.promptText ?? "" };
}

// ── Write ──────────────────────────────────────────────────────────────────

/**
 * Save a full prompt pack. Replaces all existing prompts for this visual plan.
 */
export async function upsertPromptPack(
  campaignId: string,
  visualPlanId: string,
  pack: Omit<ScenePromptPack, "visualPlanId">
): Promise<ScenePromptPack> {
  const rows = buildPromptRows(campaignId, visualPlanId, pack);

  if (hasSupabaseConfig()) {
    try {
      const supabase = await getSupabaseServerClient();
      await supabase.from("prompts").delete().eq("visual_plan_id", visualPlanId);
      const { error } = await supabase.from("prompts").insert(rows);
      if (!error) return { visualPlanId, ...pack };
      console.warn("[Supabase] upsertPromptPack failed:", error.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Supabase] upsertPromptPack network/client error: ${msg}`);
    }
  }

  await new Promise((r) => setTimeout(r, 250));
  const remaining = mockPromptRows.filter((r) => r.visual_plan_id !== visualPlanId);
  mockPromptRows.length = 0;
  mockPromptRows.push(...remaining);
  rows.forEach((r, i) =>
    mockPromptRows.push({
      id: `prompt-${Date.now()}-${i}`,
      campaign_id: r.campaign_id,
      visual_plan_id: r.visual_plan_id,
      scene_name: r.scene_name,
      prompt_type: r.prompt_type,
      prompt_text: r.prompt_text,
      metadata: r.metadata,
      created_at: new Date().toISOString(),
    })
  );

  return { visualPlanId, ...pack };
}

function buildPromptRows(
  campaignId: string,
  visualPlanId: string,
  pack: Omit<ScenePromptPack, "visualPlanId">
) {
  const rows: Array<{
    campaign_id: string;
    visual_plan_id: string;
    scene_name: string;
    prompt_type: string;
    prompt_text: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (const scene of pack.scenes) {
    const sceneName = `scene-${scene.sceneNumber}`;
    const meta = {
      sceneNumber: scene.sceneNumber,
      sceneType: scene.sceneType,
      lineReference: scene.lineReference,
      setting: scene.setting,
      emotion: scene.emotion,
    };
    rows.push({ campaign_id: campaignId, visual_plan_id: visualPlanId, scene_name: sceneName, prompt_type: "image", prompt_text: scene.imagePrompt, metadata: meta });
    rows.push({ campaign_id: campaignId, visual_plan_id: visualPlanId, scene_name: sceneName, prompt_type: "kling", prompt_text: scene.klingPrompt, metadata: meta });
  }

  rows.push({
    campaign_id: campaignId,
    visual_plan_id: visualPlanId,
    scene_name: "vo_script",
    prompt_type: "vo_script",
    prompt_text: pack.voScript,
    metadata: {},
  });

  return rows;
}
