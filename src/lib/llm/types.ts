/**
 * LLM provider abstraction types.
 *
 * All providers implement `LLMProvider` — a single `generate` method that
 * accepts a system prompt + user prompt and returns structured text.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Provider routing (see /lib/llm/index.ts):                             │
 * │                                                                        │
 * │  Claude API  → generateConcepts                                        │
 * │              → generateScript                                          │
 * │              → generateCreativeVariations                              │
 * │              → applyTransform                                          │
 * │                                                                        │
 * │  OpenAI API  → generateVOScript  (ElevenLabs-ready emotion tags)       │
 * │              → generateVisualPlan                                      │
 * │              → generateScenePromptPack                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ── Provider interface ───────────────────────────────────────────────────

export interface LLMGenerateOptions {
  /** System-level instructions / persona. */
  system: string;
  /** The user-facing prompt with all task context. */
  prompt: string;
  /** Target max tokens for the response. Provider-specific default if omitted. */
  maxTokens?: number;
  /** Sampling temperature (0-1). Provider-specific default if omitted. */
  temperature?: number;
}

export interface LLMGenerateResult {
  /** The raw text response from the model. */
  text: string;
  /** Provider-reported usage, if available. */
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface LLMProvider {
  readonly name: string;
  generate(options: LLMGenerateOptions): Promise<LLMGenerateResult>;
}

// ── Task → provider mapping ──────────────────────────────────────────────

/**
 * Every generation task in the app. Used to route to the correct provider.
 */
export type LLMTask =
  | "generateConcepts"          // Claude
  | "generateScript"            // Claude
  | "generateCreativeVariations" // Claude
  | "applyTransform"            // Claude
  | "generateVOScript"          // OpenAI
  | "generateVisualPlan"        // OpenAI
  | "generateScenePromptPack";  // OpenAI

/**
 * Which underlying provider backend a task should use.
 */
export type ProviderBackend = "claude" | "openai";

/**
 * Static mapping of task → provider backend.
 * Centralised here so generator services never hardcode provider choice.
 */
export const TASK_PROVIDER_MAP: Record<LLMTask, ProviderBackend> = {
  // ── Claude (creative strategy, copywriting, variation ideation) ────────
  generateConcepts:           "claude",
  generateScript:             "claude",
  generateCreativeVariations: "claude",
  applyTransform:             "claude",

  // ── OpenAI (production prompts, structured plans, VO tagging) ──────────
  generateVOScript:           "openai",
  generateVisualPlan:         "openai",
  generateScenePromptPack:    "openai",
};
