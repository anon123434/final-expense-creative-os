/**
 * Voiceover script repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { VoiceoverScript } from "@/types";
import type { VoScriptRow } from "@/types/database";
import { toVoiceover } from "@/lib/mappers";
import { mockVoScriptRows } from "@/lib/mock/voiceover-mock";
import { withSupabase, hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getVoScriptsByCampaign(campaignId: string): Promise<VoiceoverScript[]> {
  const data = await withSupabase("getVoScriptsByCampaign", (supabase) =>
    supabase
      .from("vo_scripts")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
  );
  if (data) return (data as VoScriptRow[]).map(toVoiceover);

  await new Promise((r) => setTimeout(r, 100));
  return mockVoScriptRows.filter((r) => r.campaign_id === campaignId).map(toVoiceover);
}

export async function getLatestVoScriptForScript(
  campaignId: string,
  scriptId: string
): Promise<VoiceoverScript | null> {
  const data = await withSupabase("getLatestVoScriptForScript", (supabase) =>
    supabase
      .from("vo_scripts")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("script_id", scriptId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
  );
  if (data) return toVoiceover(data as VoScriptRow);

  await new Promise((r) => setTimeout(r, 100));
  const row = mockVoScriptRows
    .filter((r) => r.campaign_id === campaignId && r.script_id === scriptId)
    .at(-1);
  return row ? toVoiceover(row) : null;
}

export interface UpsertVoScriptData {
  campaignId: string;
  scriptId: string;
  taggedScript: string | null;
  voiceProfile: string | null;
  deliveryNotes: string | null;
}

export async function upsertVoScript(data: UpsertVoScriptData): Promise<VoiceoverScript> {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data: row, error } = await supabase
        .from("vo_scripts")
        .insert({
          campaign_id: data.campaignId,
          script_id: data.scriptId,
          tagged_script: data.taggedScript,
          voice_profile: data.voiceProfile,
          delivery_notes: data.deliveryNotes,
        })
        .select()
        .single();
      if (!error && row) return toVoiceover(row);
      console.warn("[Supabase] upsertVoScript failed:", error?.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Supabase] upsertVoScript network/client error: ${msg}`);
    }
  }

  await new Promise((r) => setTimeout(r, 200));
  const mockRow = {
    id: `vo-${Date.now()}`,
    campaign_id: data.campaignId,
    script_id: data.scriptId,
    tagged_script: data.taggedScript,
    voice_profile: data.voiceProfile,
    delivery_notes: data.deliveryNotes,
    created_at: new Date().toISOString(),
  };
  mockVoScriptRows.push(mockRow);
  return toVoiceover(mockRow);
}
