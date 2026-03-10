/**
 * Server-only: loads user API keys from Supabase into the env cache.
 *
 * This file imports the settings repository (which depends on next/headers)
 * so it must NEVER be imported from client components or from modules that
 * are reachable by client components. Only import from server actions or
 * server components.
 */

import { getSettingsByUserId } from "@/lib/repositories/settings-repo";
import { setSettingsCache } from "./env";

/**
 * Load user's API keys from the settings table into the in-memory cache.
 * Call this once per server action / page render that needs LLM access.
 * If the user has no settings row, the cache stays empty and all lookups
 * fall through to environment variables.
 */
export async function loadSettingsKeys(userId: string): Promise<void> {
  try {
    const settings = await getSettingsByUserId(userId);
    if (settings) {
      setSettingsCache({
        anthropic: settings.claudeApiKey,
        openai: settings.openaiApiKey,
        elevenlabs: settings.elevenlabsApiKey,
        seedream: settings.seedreamApiKey,
        gemini: settings.geminiApiKey,
        kling: settings.klingApiKey,
        heygen: settings.heygenApiKey,
      });
    } else {
      setSettingsCache(null);
    }
  } catch {
    // Silently fall through to env vars if settings can't be loaded
    setSettingsCache(null);
  }
}
