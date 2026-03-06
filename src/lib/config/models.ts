/**
 * Model configuration constants.
 *
 * Central place for model IDs and default generation parameters.
 * Provider files import from here instead of hardcoding model strings.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Claude (Anthropic)                                                    │
 * │    Tasks: generateConcepts, generateScript,                            │
 * │           generateCreativeVariations, applyTransform                   │
 * │                                                                        │
 * │  OpenAI                                                                │
 * │    Tasks: generateVOScript, generateVisualPlan,                        │
 * │           generateScenePromptPack                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ── Claude ────────────────────────────────────────────────────────────────

/** Model used for creative strategy — concepts, scripts, variations, transforms. */
export const CLAUDE_MODEL = "claude-sonnet-4-20250514";

/** Default max output tokens for Claude calls. */
export const CLAUDE_MAX_TOKENS = 4096;

/** Default temperature for Claude calls (creative copywriting). */
export const CLAUDE_DEFAULT_TEMPERATURE = 0.7;

// ── OpenAI ────────────────────────────────────────────────────────────────

/** Model used for production outputs — VO scripts, visual plans, prompt packs. */
export const OPENAI_MODEL = "gpt-4o";

/** Default max output tokens for OpenAI calls. */
export const OPENAI_MAX_TOKENS = 4096;

/** Default temperature for OpenAI calls (structured output). */
export const OPENAI_DEFAULT_TEMPERATURE = 0.6;
