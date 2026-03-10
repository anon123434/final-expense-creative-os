/** User-managed API key settings. Keys are never sent to the client. */
export interface UserSettings {
  id: string;
  userId: string;
  claudeApiKey: string | null;
  openaiApiKey: string | null;
  elevenlabsApiKey: string | null;
  seedreamApiKey: string | null;
  geminiApiKey: string | null;
  klingApiKey: string | null;
  heygenApiKey: string | null;
  updatedAt: string;
}

/** Masked view for the UI — shows only whether each key is set. */
export interface SettingsKeyStatus {
  claude: boolean;
  openai: boolean;
  elevenlabs: boolean;
  seedream: boolean;
  gemini: boolean;
  kling: boolean;
  heygen: boolean;
}

/** Shape of the form data sent from the settings page. */
export interface SettingsFormData {
  claudeApiKey: string;
  openaiApiKey: string;
  elevenlabsApiKey: string;
  seedreamApiKey: string;
  geminiApiKey: string;
  klingApiKey: string;
  heygenApiKey: string;
}
