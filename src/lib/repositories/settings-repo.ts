/**
 * Settings repository — data access layer for user API keys.
 * Tries Supabase first when env vars are present, falls back to no-op.
 */

import type { UserSettings } from "@/types/settings";
import type { SettingsRow } from "@/types/database";
import { toSettings } from "@/lib/mappers";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getSettingsByUserId(userId: string): Promise<UserSettings | null> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!error && data) return toSettings(data as SettingsRow);
    // PGRST116 = row not found — expected when user has no settings yet
    if (error?.code !== "PGRST116") {
      console.warn("Supabase getSettingsByUserId failed:", error?.message);
    }
  }

  return null;
}

export interface UpsertSettingsData {
  claudeApiKey?: string | null;
  openaiApiKey?: string | null;
  elevenlabsApiKey?: string | null;
  seedreamApiKey?: string | null;
  geminiApiKey?: string | null;
  klingApiKey?: string | null;
}

export async function upsertSettings(
  userId: string,
  data: UpsertSettingsData
): Promise<UserSettings> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("settings")
      .upsert(
        {
          user_id: userId,
          claude_api_key: data.claudeApiKey ?? null,
          openai_api_key: data.openaiApiKey ?? null,
          elevenlabs_api_key: data.elevenlabsApiKey ?? null,
          seedream_api_key: data.seedreamApiKey ?? null,
          gemini_api_key: data.geminiApiKey ?? null,
          kling_api_key: data.klingApiKey ?? null,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (!error && row) return toSettings(row as SettingsRow);
    throw new Error(`Failed to save settings: ${error?.message}`);
  }

  // Mock fallback — return a synthetic settings object
  const now = new Date().toISOString();
  return {
    id: `settings-${Date.now()}`,
    userId,
    claudeApiKey: data.claudeApiKey ?? null,
    openaiApiKey: data.openaiApiKey ?? null,
    elevenlabsApiKey: data.elevenlabsApiKey ?? null,
    seedreamApiKey: data.seedreamApiKey ?? null,
    geminiApiKey: data.geminiApiKey ?? null,
    klingApiKey: data.klingApiKey ?? null,
    updatedAt: now,
  };
}
