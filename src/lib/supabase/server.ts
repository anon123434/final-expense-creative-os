import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/config/env";

/**
 * Server client — data-only mode (no auth).
 * Uses the service role key if available, otherwise anon key.
 * Safe to call from Server Components, Server Actions, and Route Handlers.
 *
 * Throws if Supabase env vars are missing — callers should check
 * `hasSupabaseConfig()` before calling this.
 */
export async function createClient() {
  const url = getSupabaseUrl();
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set or contains a placeholder value"
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = getSupabaseAnonKey();
  const key = serviceKey ?? anonKey;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set or contains a placeholder value"
    );
  }

  return createSupabaseClient(url, key);
}
