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

/**
 * Run a Supabase query with proper error logging and network error handling.
 * Returns `null` when Supabase is unavailable or the query fails, so the
 * caller can fall through to mock data.
 *
 * @param label  Human-readable name for the operation (e.g. "getCampaigns")
 * @param fn     Async callback that receives the Supabase client and returns
 *               `{ data, error }`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export async function withSupabase<T>(
  label: string,
  fn: (supabase: SupabaseClient) => PromiseLike<{ data: any; error: any }>
): Promise<T | null> {
  if (!hasSupabaseConfig()) return null;

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await fn(supabase);

    if (error) {
      // PGRST116 = "row not found" — normal for .single() queries
      if (error.code !== "PGRST116") {
        console.warn(`[Supabase] ${label} query error:`, error.message, error.code ?? "");
      }
      return null;
    }

    return data as T;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Supabase] ${label} network/client error: ${msg}`);
    return null;
  }
}
