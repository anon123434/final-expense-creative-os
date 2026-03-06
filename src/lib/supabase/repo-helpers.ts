/**
 * Shared Supabase helpers for all repository files.
 *
 * Centralises config detection and server client creation so each repo
 * doesn't need to duplicate this boilerplate. Both helpers are pure
 * utilities — no side-effects beyond the dynamic import.
 */

import { hasSupabaseEnv } from "@/lib/config/env";

/**
 * Returns true when Supabase environment variables are set and look valid.
 * When false, repositories fall back to in-memory mock data automatically.
 */
export function hasSupabaseConfig(): boolean {
  return hasSupabaseEnv();
}

/**
 * Returns a server-side Supabase client.
 * Dynamically imported to keep `next/headers` out of any client bundle.
 * Only call this inside server components, server actions, or route handlers.
 */
export async function getSupabaseServerClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}
