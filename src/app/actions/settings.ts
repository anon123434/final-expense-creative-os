"use server";

import { createClient } from "@/lib/supabase/server";
import { getSettingsByUserId, upsertSettings } from "@/lib/repositories/settings-repo";
import { resetLLMClients } from "@/lib/llm/providers/reset";
import type { SettingsKeyStatus, SettingsFormData } from "@/types/settings";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";

// ── Helpers ──────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? "00000000-0000-0000-0000-000000000001";
  } catch {
    return "00000000-0000-0000-0000-000000000001";
  }
}

// ── Load (returns masked status, never raw keys) ─────────────────────────

export async function getSettingsStatusAction(): Promise<
  { success: true; status: SettingsKeyStatus; maskedKeys: Record<string, string> } | FailResult
> {
  try {
    const userId = await getCurrentUserId();
    const settings = await getSettingsByUserId(userId);

    const mask = (key: string | null): string => {
      if (!key) return "";
      if (key.length <= 8) return "••••••••";
      return key.slice(0, 4) + "••••" + key.slice(-4);
    };

    return {
      success: true,
      status: {
        claude: !!settings?.claudeApiKey,
        openai: !!settings?.openaiApiKey,
        elevenlabs: !!settings?.elevenlabsApiKey,
        seedream: !!settings?.seedreamApiKey,
        gemini: !!settings?.geminiApiKey,
        kling: !!settings?.klingApiKey,
        heygen: !!settings?.heygenApiKey,
      },
      maskedKeys: {
        claudeApiKey: mask(settings?.claudeApiKey ?? null),
        openaiApiKey: mask(settings?.openaiApiKey ?? null),
        elevenlabsApiKey: mask(settings?.elevenlabsApiKey ?? null),
        seedreamApiKey: mask(settings?.seedreamApiKey ?? null),
        geminiApiKey: mask(settings?.geminiApiKey ?? null),
        klingApiKey: mask(settings?.klingApiKey ?? null),
        heygenApiKey: mask(settings?.heygenApiKey ?? null),
      },
    };
  } catch (err) {
    console.error("getSettingsStatusAction:", err);
    return actionFail(err, "Failed to load settings.");
  }
}

// ── Save ─────────────────────────────────────────────────────────────────

export async function saveSettingsAction(
  formData: SettingsFormData
): Promise<{ success: true; maskedKeys: Record<string, string> } | FailResult> {
  try {
    const userId = await getCurrentUserId();

    // Load existing settings to merge
    const existing = await getSettingsByUserId(userId);

    // Empty field = keep existing key. Non-empty = replace with new value.
    function resolveKey(newValue: string, existingValue: string | null): string | null {
      const trimmed = newValue.trim();
      if (!trimmed) return existingValue; // keep existing
      return trimmed;
    }

    const saved = await upsertSettings(userId, {
      claudeApiKey: resolveKey(formData.claudeApiKey, existing?.claudeApiKey ?? null),
      openaiApiKey: resolveKey(formData.openaiApiKey, existing?.openaiApiKey ?? null),
      elevenlabsApiKey: resolveKey(formData.elevenlabsApiKey, existing?.elevenlabsApiKey ?? null),
      seedreamApiKey: resolveKey(formData.seedreamApiKey, existing?.seedreamApiKey ?? null),
      geminiApiKey: resolveKey(formData.geminiApiKey, existing?.geminiApiKey ?? null),
      klingApiKey: resolveKey(formData.klingApiKey, existing?.klingApiKey ?? null),
      heygenApiKey: resolveKey(formData.heygenApiKey, existing?.heygenApiKey ?? null),
    });

    // Reset cached LLM clients so they pick up new keys on next call
    resetLLMClients();

    const mask = (key: string | null): string => {
      if (!key) return "";
      if (key.length <= 8) return "••••••••";
      return key.slice(0, 4) + "••••" + key.slice(-4);
    };

    return {
      success: true,
      maskedKeys: {
        claudeApiKey: mask(saved.claudeApiKey ?? null),
        openaiApiKey: mask(saved.openaiApiKey ?? null),
        elevenlabsApiKey: mask(saved.elevenlabsApiKey ?? null),
        seedreamApiKey: mask(saved.seedreamApiKey ?? null),
        geminiApiKey: mask(saved.geminiApiKey ?? null),
        klingApiKey: mask(saved.klingApiKey ?? null),
        heygenApiKey: mask(saved.heygenApiKey ?? null),
      },
    };
  } catch (err) {
    console.error("saveSettingsAction:", err);
    return actionFail(err, "Failed to save settings.");
  }
}
