import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client — data-only mode (no auth).
 * Use in Client Components ("use client").
 *
 * Throws if Supabase env vars are missing — callers should check
 * `hasSupabaseConfig()` before calling this.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase client env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not set"
    );
  }

  return createSupabaseClient(url, key);
}
