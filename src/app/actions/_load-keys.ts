/**
 * Shared helper for server actions that invoke LLM providers.
 * Loads the current user's API keys from the settings table into
 * the in-memory env cache so providers resolve keys correctly.
 *
 * Call this early in any action that triggers LLM generation.
 */

import { DEFAULT_USER_ID } from "@/lib/config/env";
import { loadSettingsKeys } from "@/lib/config/settings-loader";

export async function loadUserKeys(): Promise<void> {
  try {
    await loadSettingsKeys(DEFAULT_USER_ID);
  } catch {
    // Non-fatal — providers will fall back to env vars
  }
}
