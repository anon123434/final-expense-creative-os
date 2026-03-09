/**
 * Environment variable access with validation.
 *
 * All env reads go through this module so there is exactly one place
 * to audit what the app reads from the environment.
 *
 * ── Key resolution order ───────────────────────────────────────────────
 *   1. In-memory cache (populated from Supabase `settings` table)
 *   2. Environment variable (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
 *
 * Call `loadSettingsKeys(userId)` once per request to populate the cache.
 * If never called, all lookups fall through to env vars as before.
 *
 * ── Required (app won't start without these) ────────────────────────────
 *   (none — Supabase and LLM keys are all optional with fallbacks)
 *
 * ── Optional ─────────────────────────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anonymous key
 *   ANTHROPIC_API_KEY            — enables Claude for concepts/scripts
 *   OPENAI_API_KEY               — enables OpenAI for VO/visual/prompts
 *
 * When an optional key is missing the relevant subsystem falls back to
 * built-in mocks — the app remains fully functional for local dev.
 */

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Reads a server-side env var. Returns `undefined` when the var is unset,
 * empty, or still contains the placeholder value from .env.local.example.
 */
function readServerVar(key: string, placeholders: string[] = []): string | undefined {
  const raw = process.env[key];
  if (!raw || raw.trim() === "") return undefined;
  if (placeholders.some((p) => raw === p)) return undefined;
  return raw;
}

// ── Supabase ─────────────────────────────────────────────────────────────

export function getSupabaseUrl(): string | undefined {
  return readServerVar("NEXT_PUBLIC_SUPABASE_URL", [
    "https://your-project-ref.supabase.co",
  ]);
}

export function getSupabaseAnonKey(): string | undefined {
  return readServerVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", [
    "your-anon-key-here",
  ]);
}

export function hasSupabaseEnv(): boolean {
  return !!getSupabaseUrl() && !!getSupabaseAnonKey();
}

// ── Settings-based key cache ─────────────────────────────────────────────
//
// Populated once per request via `loadSettingsKeys()`.
// These are checked BEFORE environment variables.

interface SettingsKeyCache {
  anthropic: string | null;
  openai: string | null;
  elevenlabs: string | null;
  seedream: string | null;
  gemini: string | null;
  kling: string | null;
}

// Store on globalThis so the cache survives module re-evaluations in Next.js dev mode.
type GlobalWithCache = typeof globalThis & { _settingsCache?: SettingsKeyCache | null };
const _g = globalThis as GlobalWithCache;

function getCache(): SettingsKeyCache | null {
  return _g._settingsCache ?? null;
}

/**
 * Set the in-memory settings cache directly.
 * Called by `loadSettingsKeys()` in `@/lib/config/settings-loader` (server-only).
 */
export function setSettingsCache(cache: SettingsKeyCache | null): void {
  _g._settingsCache = cache;
}

/** Clear the cached settings keys (used after saving new settings). */
export function clearSettingsCache(): void {
  _g._settingsCache = null;
}

// ── LLM providers ────────────────────────────────────────────────────────

// --- Anthropic / Claude ---

export function getAnthropicApiKey(): string | undefined {
  return readServerVar("ANTHROPIC_API_KEY", ["sk-ant-..."]);
}

/** Settings → env fallback. Used by the Claude provider to get the key. */
export function resolveAnthropicApiKey(): string | undefined {
  return getCache()?.anthropic ?? getAnthropicApiKey();
}

export function hasAnthropicEnv(): boolean {
  return !!getAnthropicApiKey();
}

/** True if a Claude key is available from settings OR env. */
export function hasAnthropicKey(): boolean {
  return !!resolveAnthropicApiKey();
}

// --- OpenAI ---

export function getOpenAIApiKey(): string | undefined {
  return readServerVar("OPENAI_API_KEY", ["sk-..."]);
}

/** Settings → env fallback. Used by the OpenAI provider to get the key. */
export function resolveOpenAIApiKey(): string | undefined {
  return getCache()?.openai ?? getOpenAIApiKey();
}

export function hasOpenAIEnv(): boolean {
  return !!getOpenAIApiKey();
}

/** True if an OpenAI key is available from settings OR env. */
export function hasOpenAIKey(): boolean {
  return !!resolveOpenAIApiKey();
}

// --- Gemini ---

export function resolveGeminiApiKey(): string | undefined {
  return getCache()?.gemini ?? readServerVar("GEMINI_API_KEY");
}

export function hasGeminiKey(): boolean {
  return !!resolveGeminiApiKey();
}

// ── Summary (useful for startup logging) ─────────────────────────────────

export interface EnvStatus {
  supabase: boolean;
  anthropic: boolean;
  openai: boolean;
}

/**
 * Returns a snapshot of which optional integrations are configured.
 * Safe to call at any time — never throws.
 */
export function getEnvStatus(): EnvStatus {
  return {
    supabase: hasSupabaseEnv(),
    anthropic: hasAnthropicKey(),
    openai: hasOpenAIKey(),
  };
}
