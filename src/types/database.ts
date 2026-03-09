/**
 * Database row types — 1:1 mirror of Supabase tables.
 * All keys are snake_case to match the DB schema.
 * These should NOT be used directly in UI components.
 * Use the domain types in @/types instead.
 */

export interface CampaignRow {
  id: string;
  user_id: string;
  title: string;
  offer_name: string | null;
  persona_id: string | null;
  archetype_id: string | null;
  emotional_tone: string | null;
  duration_seconds: number | null;
  phone_number: string | null;
  phone_number_phonetic: string | null;
  deadline_text: string | null;
  benefit_amount: string | null;
  affordability_text: string | null;
  cta_style: string | null;
  notes: string | null;
  persona_image_url: string | null;
  avatar_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignInsert {
  title: string;
  user_id: string;
  offer_name?: string | null;
  persona_id?: string | null;
  archetype_id?: string | null;
  emotional_tone?: string | null;
  duration_seconds?: number | null;
  phone_number?: string | null;
  phone_number_phonetic?: string | null;
  deadline_text?: string | null;
  benefit_amount?: string | null;
  affordability_text?: string | null;
  cta_style?: string | null;
  notes?: string | null;
  persona_image_url?: string | null;
}

export interface CampaignUpdate {
  title?: string;
  offer_name?: string | null;
  persona_id?: string | null;
  archetype_id?: string | null;
  emotional_tone?: string | null;
  duration_seconds?: number | null;
  phone_number?: string | null;
  phone_number_phonetic?: string | null;
  deadline_text?: string | null;
  benefit_amount?: string | null;
  affordability_text?: string | null;
  cta_style?: string | null;
  notes?: string | null;
  persona_image_url?: string | null;
  avatar_id?: string | null;
}

export interface CampaignTriggerRow {
  id: string;
  campaign_id: string;
  trigger_key: string;
  included: boolean;
}

export interface CampaignTriggerInsert {
  campaign_id: string;
  trigger_key: string;
  included?: boolean;
}

export interface ConceptRow {
  id: string;
  campaign_id: string;
  title: string;
  one_sentence_angle: string | null;
  hook: string | null;
  emotional_setup: string | null;
  conflict: string | null;
  solution: string | null;
  payoff: string | null;
  cta: string | null;
  trigger_map: Record<string, unknown> | null;
  visual_world: string | null;
  llm_raw: Record<string, unknown> | null;
  is_selected: boolean;
  created_at: string;
}

export interface ConceptInsert {
  campaign_id: string;
  title: string;
  one_sentence_angle?: string | null;
  hook?: string | null;
  emotional_setup?: string | null;
  conflict?: string | null;
  solution?: string | null;
  payoff?: string | null;
  cta?: string | null;
  trigger_map?: Record<string, unknown> | null;
  visual_world?: string | null;
  llm_raw?: Record<string, unknown> | null;
  is_selected?: boolean;
}

export interface ScriptRow {
  id: string;
  campaign_id: string;
  concept_id: string;
  version_name: string | null;
  duration_seconds: number | null;
  full_script: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ScriptInsert {
  campaign_id: string;
  concept_id: string;
  version_name?: string | null;
  duration_seconds?: number | null;
  full_script?: string | null;
  hook?: string | null;
  body?: string | null;
  cta?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface VoScriptRow {
  id: string;
  campaign_id: string;
  script_id: string;
  tagged_script: string | null;
  voice_profile: string | null;
  delivery_notes: string | null;
  created_at: string;
}

export interface VoScriptInsert {
  campaign_id: string;
  script_id: string;
  tagged_script?: string | null;
  voice_profile?: string | null;
  delivery_notes?: string | null;
}

export interface VisualPlanRow {
  id: string;
  campaign_id: string;
  script_id: string;
  overall_direction: string | null;
  base_layer: string | null;
  a_roll: string[] | null;
  b_roll: string[] | null;
  scene_breakdown: Record<string, unknown>[] | null;
  created_at: string;
}

export interface VisualPlanInsert {
  campaign_id: string;
  script_id: string;
  overall_direction?: string | null;
  base_layer?: string | null;
  a_roll?: string[] | null;
  b_roll?: string[] | null;
  scene_breakdown?: Record<string, unknown>[] | null;
}

export interface PromptRow {
  id: string;
  campaign_id: string;
  visual_plan_id: string;
  scene_name: string | null;
  prompt_type: string | null;
  prompt_text: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PromptInsert {
  campaign_id: string;
  visual_plan_id: string;
  scene_name?: string | null;
  prompt_type?: string | null;
  prompt_text?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CampaignVersionRow {
  id: string;
  campaign_id: string;
  name: string;
  snapshot: Record<string, unknown>;
  created_at: string;
}

export interface CampaignVersionInsert {
  campaign_id: string;
  name: string;
  snapshot: Record<string, unknown>;
}

export interface CreativeVariationRow {
  id: string;
  campaign_id: string;
  title: string;
  hook: string | null;
  one_sentence_angle: string | null;
  emotional_tone: string | null;
  what_changed: string[] | null;
  trigger_stack: Record<string, boolean> | null;
  scene_summary: string[] | null;
  image_prompt_examples: string[] | null;
  kling_prompt_examples: string[] | null;
  raw_output: Record<string, unknown> | null;
  created_at: string;
}

// ── Settings ──────────────────────────────────────────────────────────────

export interface SettingsRow {
  id: string;
  user_id: string;
  claude_api_key: string | null;
  openai_api_key: string | null;
  elevenlabs_api_key: string | null;
  seedream_api_key: string | null;
  gemini_api_key: string | null;
  kling_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingsUpsert {
  user_id: string;
  claude_api_key?: string | null;
  openai_api_key?: string | null;
  elevenlabs_api_key?: string | null;
  seedream_api_key?: string | null;
  gemini_api_key?: string | null;
  kling_api_key?: string | null;
}

export interface CreativeVariationInsert {
  campaign_id: string;
  title: string;
  hook?: string | null;
  one_sentence_angle?: string | null;
  emotional_tone?: string | null;
  what_changed?: string[] | null;
  trigger_stack?: Record<string, boolean> | null;
  scene_summary?: string[] | null;
  image_prompt_examples?: string[] | null;
  kling_prompt_examples?: string[] | null;
  raw_output?: Record<string, unknown> | null;
}

// ── Avatars ──────────────────────────────────────────────────────────────

export interface AvatarRow {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  expanded_prompt: string | null;
  mode: string;
  aspect_ratio: string;
  reference_image_url: string | null;
  image_urls: string[];
  created_at: string;
}

export interface AvatarInsert {
  user_id: string;
  name: string;
  prompt: string;
  expanded_prompt?: string | null;
  mode: string;
  aspect_ratio: string;
  reference_image_url?: string | null;
  image_urls?: string[];
}

export interface AvatarUpdate {
  name?: string;
  image_urls?: string[];
  avatar_id?: string | null;
}
