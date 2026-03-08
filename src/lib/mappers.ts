/**
 * Maps between database rows (snake_case) and domain types (camelCase).
 * Each mapper is a pure function with no side effects.
 */

import type {
  CampaignRow,
  CampaignTriggerRow,
  ConceptRow,
  ScriptRow,
  VoScriptRow,
  VisualPlanRow,
  PromptRow,
  CampaignVersionRow,
  CreativeVariationRow,
  SettingsRow,
} from "@/types/database";

import type {
  Campaign,
  CampaignTrigger,
  AdConcept,
  Script,
  VoiceoverScript,
  VisualPlan,
  ImagePrompt,
} from "@/types";
import type { CampaignVersion, CampaignSnapshot } from "@/types/version";
import type { CreativeVariation } from "@/types/variation";
import type { UserSettings } from "@/types/settings";

export function toCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    offerName: row.offer_name,
    personaId: row.persona_id,
    archetypeId: row.archetype_id,
    emotionalTone: row.emotional_tone,
    durationSeconds: row.duration_seconds,
    phoneNumber: row.phone_number,
    phoneNumberPhonetic: row.phone_number_phonetic,
    deadlineText: row.deadline_text,
    benefitAmount: row.benefit_amount,
    affordabilityText: row.affordability_text,
    ctaStyle: row.cta_style,
    notes: row.notes,
    personaImageUrl: row.persona_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCampaignTrigger(row: CampaignTriggerRow): CampaignTrigger {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    triggerKey: row.trigger_key,
    included: row.included,
  };
}

export function toConcept(row: ConceptRow): AdConcept {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    title: row.title,
    oneSentenceAngle: row.one_sentence_angle,
    hook: row.hook,
    emotionalSetup: row.emotional_setup,
    conflict: row.conflict,
    solution: row.solution,
    payoff: row.payoff,
    cta: row.cta,
    triggerMap: row.trigger_map,
    visualWorld: row.visual_world,
    llmRaw: row.llm_raw,
    isSelected: row.is_selected,
    createdAt: row.created_at,
  };
}

export function toScript(row: ScriptRow): Script {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    conceptId: row.concept_id,
    versionName: row.version_name,
    durationSeconds: row.duration_seconds,
    fullScript: row.full_script,
    hook: row.hook,
    body: row.body,
    cta: row.cta,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export function toVoiceover(row: VoScriptRow): VoiceoverScript {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    scriptId: row.script_id,
    taggedScript: row.tagged_script,
    voiceProfile: row.voice_profile,
    deliveryNotes: row.delivery_notes,
    createdAt: row.created_at,
  };
}

export function toVisualPlan(row: VisualPlanRow): VisualPlan {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    scriptId: row.script_id,
    overallDirection: row.overall_direction,
    baseLayer: row.base_layer,
    aRoll: (row.a_roll as string[] | null) ?? null,
    bRoll: (row.b_roll as string[] | null) ?? null,
    sceneBreakdown: (row.scene_breakdown as VisualPlan["sceneBreakdown"]) ?? null,
    createdAt: row.created_at,
  };
}

export function toImagePrompt(row: PromptRow): ImagePrompt {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    visualPlanId: row.visual_plan_id,
    sceneName: row.scene_name,
    promptType: row.prompt_type,
    promptText: row.prompt_text,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export function toCampaignVersion(row: CampaignVersionRow): CampaignVersion {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    snapshot: row.snapshot as unknown as CampaignSnapshot,
    createdAt: row.created_at,
  };
}

export function toCreativeVariation(row: CreativeVariationRow, index = 0): CreativeVariation {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    variationNumber: (row.raw_output?.variationNumber as number | undefined) ?? index + 1,
    title: row.title,
    hook: row.hook ?? "",
    oneSentenceAngle: row.one_sentence_angle ?? "",
    emotionalTone: row.emotional_tone ?? "",
    whatChanged: row.what_changed ?? [],
    triggerStack: row.trigger_stack ?? {},
    sceneSummary: row.scene_summary ?? [],
    imagePromptExamples: row.image_prompt_examples ?? [],
    klingPromptExamples: row.kling_prompt_examples ?? [],
    createdAt: row.created_at,
  };
}

export function toSettings(row: SettingsRow): UserSettings {
  return {
    id: row.id,
    userId: row.user_id,
    claudeApiKey: row.claude_api_key,
    openaiApiKey: row.openai_api_key,
    elevenlabsApiKey: row.elevenlabs_api_key,
    seedreamApiKey: row.seedream_api_key,
    geminiApiKey: row.gemini_api_key,
    klingApiKey: row.kling_api_key,
    updatedAt: row.updated_at,
  };
}
