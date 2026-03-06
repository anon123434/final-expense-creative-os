/**
 * Shared helper for server actions that invoke LLM providers.
 * Loads the current user's API keys from the settings table into
 * the in-memory env cache so providers resolve keys correctly.
 *
 * Call this early in any action that triggers LLM generation.
 */

import { createClient } from "@/lib/supabase/server";
import { loadSettingsKeys } from "@/lib/config/settings-loader";

export async function loadUserKeys(): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? "user-mock-001";
    await loadSettingsKeys(userId);
  } catch {
    // Non-fatal — providers will fall back to env vars
  }
}
