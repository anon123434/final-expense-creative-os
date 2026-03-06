/**
 * Settings repository — data access layer for user API keys.
 * Uses the Supabase JS client directly (no raw fetch).
 * Falls back to in-memory storage when Supabase is unreachable.
 */

import type { UserSettings } from "@/types/settings";
import type { SettingsRow } from "@/types/database";
import { toSettings } from "@/lib/mappers";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

/** Valid UUID used for all DB operations in local single-user mode. */
const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";

/** In-memory fallback when Supabase is not available. */
let memoryStore: UserSettings | null = null;

export async function getSettingsByUserId(
  _userId?: string
): Promise<UserSettings | null> {
  if (!hasSupabaseConfig()) return memoryStore;

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", LOCAL_USER_ID)
      .maybeSingle();

    if (error) {
      console.error(
        "[settings-repo] getSettingsByUserId error:",
        error.message,
        error.code,
        error.details
      );
      return memoryStore;
    }

    return data ? toSettings(data as SettingsRow) : null;
  } catch (err) {
    console.error(
      "[settings-repo] getSettingsByUserId failed (network):",
      err instanceof Error ? err.message : err
    );
    return memoryStore;
  }
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
  _userId: string,
  data: UpsertSettingsData
): Promise<UserSettings> {
  const now = new Date().toISOString();

  // Build the fallback object once — used for both memory store and error path
  const fallback: UserSettings = {
    id: memoryStore?.id ?? `settings-${Date.now()}`,
    userId: LOCAL_USER_ID,
    claudeApiKey: data.claudeApiKey ?? null,
    openaiApiKey: data.openaiApiKey ?? null,
    elevenlabsApiKey: data.elevenlabsApiKey ?? null,
    seedreamApiKey: data.seedreamApiKey ?? null,
    geminiApiKey: data.geminiApiKey ?? null,
    klingApiKey: data.klingApiKey ?? null,
    updatedAt: now,
  };

  if (!hasSupabaseConfig()) {
    memoryStore = fallback;
    return fallback;
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("settings")
      .upsert(
        {
          user_id: LOCAL_USER_ID,
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

    if (error) {
      console.error(
        "[settings-repo] upsertSettings error:",
        JSON.stringify(
          { message: error.message, code: error.code, details: error.details, hint: error.hint },
          null,
          2
        )
      );
      // Save to memory so the UI still works
      memoryStore = fallback;
      return fallback;
    }

    const saved = toSettings(row as SettingsRow);
    memoryStore = saved;
    return saved;
  } catch (err) {
    console.error(
      "[settings-repo] upsertSettings failed (network):",
      err instanceof Error ? err.message : err
    );
    memoryStore = fallback;
    return fallback;
  }
}
