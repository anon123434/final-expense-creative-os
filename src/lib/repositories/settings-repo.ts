/**
 * Settings repository — data access layer for user API keys.
 * Tries Supabase first when env vars are present.
 * Falls back to local JSON file (.local-settings.json) when Supabase is unreachable.
 */

import type { UserSettings } from "@/types/settings";
import type { SettingsRow } from "@/types/database";
import { toSettings } from "@/lib/mappers";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";
import { readLocalSettings, writeLocalSettings } from "@/lib/local-settings";

export async function getSettingsByUserId(userId: string): Promise<UserSettings | null> {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!error && data) return toSettings(data as SettingsRow);
      if (error?.code !== "PGRST116") {
        console.warn("Supabase getSettingsByUserId failed:", error?.message);
      }
    } catch (err) {
      console.warn("Supabase getSettingsByUserId unreachable, using local file:", (err as Error).message);
    }
  }

  // Local file fallback
  const local = readLocalSettings();
  if (!local || Object.keys(local).length === 0) return null;
  const now = new Date().toISOString();
  return {
    id: "local",
    userId,
    claudeApiKey: local.claudeApiKey ?? null,
    openaiApiKey: local.openaiApiKey ?? null,
    elevenlabsApiKey: local.elevenlabsApiKey ?? null,
    seedreamApiKey: local.seedreamApiKey ?? null,
    geminiApiKey: local.geminiApiKey ?? null,
    klingApiKey: local.klingApiKey ?? null,
    heygenApiKey: local.heygenApiKey ?? null,
    updatedAt: now,
  };
}

export interface UpsertSettingsData {
  claudeApiKey?: string | null;
  openaiApiKey?: string | null;
  elevenlabsApiKey?: string | null;
  seedreamApiKey?: string | null;
  geminiApiKey?: string | null;
  klingApiKey?: string | null;
  heygenApiKey?: string | null;
}

export async function upsertSettings(
  userId: string,
  data: UpsertSettingsData
): Promise<UserSettings> {
  if (hasSupabaseConfig()) {
    try {
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
            heygen_api_key: data.heygenApiKey ?? null,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (!error && row) return toSettings(row as SettingsRow);
      console.warn("Supabase upsertSettings failed, falling back to local file:", error?.message);
    } catch (err) {
      console.warn("Supabase upsertSettings unreachable, using local file:", (err as Error).message);
    }
  }

  // Local file fallback — persists across restarts
  writeLocalSettings(data);
  const now = new Date().toISOString();
  return {
    id: "local",
    userId,
    claudeApiKey: data.claudeApiKey ?? null,
    openaiApiKey: data.openaiApiKey ?? null,
    elevenlabsApiKey: data.elevenlabsApiKey ?? null,
    seedreamApiKey: data.seedreamApiKey ?? null,
    geminiApiKey: data.geminiApiKey ?? null,
    klingApiKey: data.klingApiKey ?? null,
    heygenApiKey: data.heygenApiKey ?? null,
    updatedAt: now,
  };
}
