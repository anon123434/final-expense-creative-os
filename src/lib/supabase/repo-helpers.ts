/**
 * Shared Supabase helpers for all repository files.
 *
 * Centralises config detection and server client creation so each repo
 * doesn't need to duplicate this boilerplate. Both helpers are pure
 * utilities — no side-effects beyond the dynamic import.
 */

import { hasSupabaseEnv, getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/config/env";

/**
 * Returns true when Supabase environment variables are set and look valid.
 * When false, repositories fall back to in-memory mock data automatically.
 */
export function hasSupabaseConfig(): boolean {
  return hasSupabaseEnv();
}

/**
 * Returns a service-role Supabase client that bypasses RLS.
 * Use this for all server-side DB operations since the app doesn't use Supabase Auth.
 * Falls back to cookie-based client if service role key is not set.
 */
export async function getSupabaseServerClient() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();

  if (url && serviceKey) {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // Fallback: cookie-based anon client (will fail RLS if not authenticated)
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}
