/**
 * Script repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { Script } from "@/types";
import type { ScriptRow } from "@/types/database";
import { toScript } from "@/lib/mappers";
import { mockScriptRows } from "@/lib/mock/script-mock";
import { withSupabase, hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getScriptsByCampaign(campaignId: string): Promise<Script[]> {
  const data = await withSupabase("getScriptsByCampaign", (supabase) =>
    supabase
      .from("scripts")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
  );
  if (data) return (data as ScriptRow[]).map(toScript);

  await new Promise((r) => setTimeout(r, 100));
  return mockScriptRows.filter((r) => r.campaign_id === campaignId).map(toScript);
}

export async function getLatestScriptForConcept(
  campaignId: string,
  conceptId: string
): Promise<Script | null> {
  const data = await withSupabase("getLatestScriptForConcept", (supabase) =>
    supabase
      .from("scripts")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("concept_id", conceptId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
  );
  if (data) return toScript(data as ScriptRow);

  await new Promise((r) => setTimeout(r, 100));
  const row = mockScriptRows
    .filter((r) => r.campaign_id === campaignId && r.concept_id === conceptId)
    .at(-1);
  return row ? toScript(row) : null;
}

export interface UpsertScriptData {
  campaignId: string;
  conceptId: string;
  versionName: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  fullScript: string | null;
  durationSeconds: number | null;
  metadata: Record<string, unknown> | null;
}

export async function upsertScript(data: UpsertScriptData): Promise<Script> {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data: row, error } = await supabase
        .from("scripts")
        .insert({
          campaign_id: data.campaignId,
          concept_id: data.conceptId,
          version_name: data.versionName,
          hook: data.hook,
          body: data.body,
          cta: data.cta,
          full_script: data.fullScript,
          duration_seconds: data.durationSeconds,
          metadata: data.metadata,
        })
        .select()
        .single();
      if (!error && row) return toScript(row);
      console.warn("[Supabase] upsertScript failed:", error?.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Supabase] upsertScript network/client error: ${msg}`);
    }
  }

  await new Promise((r) => setTimeout(r, 200));
  const mockRow = {
    id: `script-${Date.now()}`,
    campaign_id: data.campaignId,
    concept_id: data.conceptId,
    version_name: data.versionName ?? null,
    duration_seconds: data.durationSeconds ?? null,
    full_script: data.fullScript ?? null,
    hook: data.hook ?? null,
    body: data.body ?? null,
    cta: data.cta ?? null,
    metadata: data.metadata ?? null,
    created_at: new Date().toISOString(),
  };
  mockScriptRows.push(mockRow);
  return toScript(mockRow);
}
