/**
 * Voiceover script repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { VoiceoverScript } from "@/types";
import { toVoiceover } from "@/lib/mappers";
import { mockVoScriptRows } from "@/lib/mock/voiceover-mock";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getVoScriptsByCampaign(campaignId: string): Promise<VoiceoverScript[]> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("vo_scripts")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    if (!error && data) return data.map(toVoiceover);
    console.warn("Supabase getVoScriptsByCampaign failed, using mock:", error?.message);
  }
  await new Promise((r) => setTimeout(r, 100));
  return mockVoScriptRows.filter((r) => r.campaign_id === campaignId).map(toVoiceover);
}

export async function getLatestVoScriptForScript(
  campaignId: string,
  scriptId: string
): Promise<VoiceoverScript | null> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("vo_scripts")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("script_id", scriptId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!error && data) return toVoiceover(data);
    if (error?.code !== "PGRST116") {
      console.warn("Supabase getLatestVoScriptForScript failed, using mock:", error?.message);
    }
    // fall through to mock
  }
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
    console.warn("Supabase upsertVoScript failed, using mock:", error?.message);
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
