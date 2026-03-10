"use client";

import { useState, useTransition } from "react";
import { Key, Save, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveSettingsAction } from "@/app/actions/settings";
import type { SettingsFormData } from "@/types/settings";

// ── Key field config ─────────────────────────────────────────────────────

interface KeyFieldConfig {
  key: keyof SettingsFormData;
  label: string;
  placeholder: string;
  hint: string;
  group: "active" | "future";
}

const KEY_FIELDS: KeyFieldConfig[] = [
  {
    key: "claudeApiKey",
    label: "Claude API Key",
    placeholder: "sk-ant-api03-…",
    hint: "Powers concept generation, script writing, and creative variations.",
    group: "active",
  },
  {
    key: "openaiApiKey",
    label: "OpenAI API Key",
    placeholder: "sk-…",
    hint: "Powers ElevenLabs VO formatting, visual plans, and scene prompts.",
    group: "active",
  },
  {
    key: "elevenlabsApiKey",
    label: "ElevenLabs API Key",
    placeholder: "xi-…",
    hint: "Text-to-speech voice generation. Coming soon.",
    group: "future",
  },
  {
    key: "seedreamApiKey",
    label: "Seedream API Key",
    placeholder: "sd-…",
    hint: "AI image generation. Coming soon.",
    group: "future",
  },
  {
    key: "geminiApiKey",
    label: "Gemini API Key",
    placeholder: "AIza…",
    hint: "Google Gemini models. Coming soon.",
    group: "future",
  },
  {
    key: "klingApiKey",
    label: "Kling API Key",
    placeholder: "kling-…",
    hint: "AI video generation. Coming soon.",
    group: "future",
  },
  {
    key: "heygenApiKey",
    label: "HeyGen API Key",
    placeholder: "api-key-…",
    hint: "Powers talking video generation from scene stills.",
    group: "active",
  },
];

// ── Component ────────────────────────────────────────────────────────────

interface SettingsFormProps {
  maskedKeys: Record<string, string>;
}

export function SettingsForm({ maskedKeys }: SettingsFormProps) {
  // Fields always start empty — a non-empty value means "replace the key"
  // Leaving a field empty means "keep the existing key"
  const [values, setValues] = useState<SettingsFormData>({
    claudeApiKey: "",
    openaiApiKey: "",
    elevenlabsApiKey: "",
    seedreamApiKey: "",
    geminiApiKey: "",
    klingApiKey: "",
    heygenApiKey: "",
  });

  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [saving, startSaving] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Track which keys are currently saved (so we can show the indicator)
  const [savedMasked, setSavedMasked] = useState<Record<string, string>>(maskedKeys);

  function handleChange(key: keyof SettingsFormData, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  }

  function toggleVisibility(key: string) {
    setShowKey((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    setError(null);
    startSaving(async () => {
      const result = await saveSettingsAction(values);
      if (result.success) {
        setStatus("saved");
        // Update the saved indicators and clear the inputs
        setSavedMasked(result.maskedKeys ?? savedMasked);
        setValues({
          claudeApiKey: "",
          openaiApiKey: "",
          elevenlabsApiKey: "",
          seedreamApiKey: "",
          geminiApiKey: "",
          klingApiKey: "",
          heygenApiKey: "",
        });
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setError(result.error);
      }
    });
  }

  const activeFields = KEY_FIELDS.filter((f) => f.group === "active");
  const futureFields = KEY_FIELDS.filter((f) => f.group === "future");

  return (
    <div className="space-y-6">
      {/* Active providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Model Providers
          </CardTitle>
          <CardDescription>
            API keys used by the generation pipeline. Keys are stored securely in
            your database and never exposed to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {activeFields.map((field) => (
            <KeyField
              key={field.key}
              field={field}
              value={values[field.key]}
              existingMasked={savedMasked[field.key] ?? ""}
              visible={!!showKey[field.key]}
              onChange={(v) => handleChange(field.key, v)}
              onToggleVisibility={() => toggleVisibility(field.key)}
              disabled={saving}
            />
          ))}
        </CardContent>
      </Card>

      {/* Future providers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Future Integrations</CardTitle>
          <CardDescription>
            These keys are saved but not yet used by the pipeline. You can
            configure them now so they're ready when support is added.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {futureFields.map((field) => (
            <KeyField
              key={field.key}
              field={field}
              value={values[field.key]}
              existingMasked={savedMasked[field.key] ?? ""}
              visible={!!showKey[field.key]}
              onChange={(v) => handleChange(field.key, v)}
              onToggleVisibility={() => toggleVisibility(field.key)}
              disabled={saving}
            />
          ))}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3">
        {status === "saved" && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved
          </span>
        )}
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

// ── Key input field ──────────────────────────────────────────────────────

interface KeyFieldProps {
  field: KeyFieldConfig;
  value: string;
  existingMasked: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
  disabled: boolean;
}

function KeyField({
  field,
  value,
  existingMasked,
  visible,
  onChange,
  onToggleVisibility,
  disabled,
}: KeyFieldProps) {
  const isSaved = !!existingMasked;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">
          {field.label}
        </label>
        {isSaved && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Saved: {existingMasked}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{field.hint}</p>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSaved ? "Enter new key to replace…" : field.placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-10 text-sm font-mono shadow-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:opacity-50"
          )}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide key" : "Show key"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
