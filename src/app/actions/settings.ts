"use server";

import { getSettingsByUserId, upsertSettings } from "@/lib/repositories/settings-repo";
import { resetLLMClients } from "@/lib/llm/providers/reset";
import type { SettingsKeyStatus, SettingsFormData } from "@/types/settings";
import type { FailResult } from "@/lib/result";
import { actionFail } from "@/lib/result";

/** Valid UUID used for local single-user mode (no auth). */
const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";

// ── Load (returns masked status, never raw keys) ─────────────────────────

export async function getSettingsStatusAction(): Promise<
  { success: true; status: SettingsKeyStatus; maskedKeys: Record<string, string> } | FailResult
> {
  try {
    const settings = await getSettingsByUserId(LOCAL_USER_ID);

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
      },
      maskedKeys: {
        claudeApiKey: mask(settings?.claudeApiKey ?? null),
        openaiApiKey: mask(settings?.openaiApiKey ?? null),
        elevenlabsApiKey: mask(settings?.elevenlabsApiKey ?? null),
        seedreamApiKey: mask(settings?.seedreamApiKey ?? null),
        geminiApiKey: mask(settings?.geminiApiKey ?? null),
        klingApiKey: mask(settings?.klingApiKey ?? null),
      },
    };
  } catch (err) {
    console.error("getSettingsStatusAction:", err);
    return actionFail(err, "Failed to load settings.");
  }
}

// ── Save ─────────────────────────────────────────────────────────────────

/** Sentinel value for "field was not changed" — the masked placeholder. */
const UNCHANGED_PATTERN = /^.{4}••••.{4}$|^••••••••$/;

export async function saveSettingsAction(
  formData: SettingsFormData
): Promise<{ success: true } | FailResult> {
  try {
    // Load existing settings to merge unchanged fields
    const existing = await getSettingsByUserId(LOCAL_USER_ID);

    function resolveKey(
      newValue: string,
      existingValue: string | null
    ): string | null {
      // Empty = user cleared the field → remove key
      if (!newValue.trim()) return null;
      // Masked placeholder = user didn't change it → keep existing
      if (UNCHANGED_PATTERN.test(newValue)) return existingValue;
      // New value entered
      return newValue.trim();
    }

    await upsertSettings(LOCAL_USER_ID, {
      claudeApiKey: resolveKey(formData.claudeApiKey, existing?.claudeApiKey ?? null),
      openaiApiKey: resolveKey(formData.openaiApiKey, existing?.openaiApiKey ?? null),
      elevenlabsApiKey: resolveKey(formData.elevenlabsApiKey, existing?.elevenlabsApiKey ?? null),
      seedreamApiKey: resolveKey(formData.seedreamApiKey, existing?.seedreamApiKey ?? null),
      geminiApiKey: resolveKey(formData.geminiApiKey, existing?.geminiApiKey ?? null),
      klingApiKey: resolveKey(formData.klingApiKey, existing?.klingApiKey ?? null),
    });

    // Reset cached LLM clients so they pick up new keys on next call
    resetLLMClients();

    return { success: true };
  } catch (err) {
    console.error("saveSettingsAction:", err);
    return actionFail(err, "Failed to save settings.");
  }
}
