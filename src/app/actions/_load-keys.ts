/**
 * Shared helper for server actions that invoke LLM providers.
 * Loads the current user's API keys from the settings table into
 * the in-memory env cache so providers resolve keys correctly.
 *
 * Call this early in any action that triggers LLM generation.
 */

import { loadSettingsKeys } from "@/lib/config/settings-loader";

export async function loadUserKeys(): Promise<void> {
  // Resolve user ID — try Supabase auth, but always fall back to the mock
  // user ID so local-file settings are loaded even without a DB connection.
  let userId = "user-mock-001";
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) userId = user.id;
  } catch {
    // Supabase unreachable — use mock user ID
  }

  // Always load settings keys regardless of whether Supabase auth succeeded.
  await loadSettingsKeys(userId);
}
