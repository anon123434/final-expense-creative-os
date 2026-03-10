/**
 * Local file-based settings store.
 * Used as fallback when Supabase is unavailable (local dev / no DB).
 * Keys are written to .local-settings.json in the project root.
 */

import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), ".local-settings.json");

interface LocalSettings {
  claudeApiKey?: string | null;
  openaiApiKey?: string | null;
  elevenlabsApiKey?: string | null;
  seedreamApiKey?: string | null;
  geminiApiKey?: string | null;
  klingApiKey?: string | null;
  heygenApiKey?: string | null;
}

export function readLocalSettings(): LocalSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return {};
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(raw) as LocalSettings;
  } catch {
    return {};
  }
}

export function writeLocalSettings(data: LocalSettings): void {
  try {
    const existing = readLocalSettings();
    const merged = { ...existing, ...data };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  } catch {
    // Silently fail in read-only environments (e.g. Vercel production).
    // In production, settings are persisted via Supabase — local file is dev-only.
  }
}
