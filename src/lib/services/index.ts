/**
 * Service layer barrel export.
 *
 * Each service is an async function with an explicit input/output contract.
 * Services call the correct LLM provider (Claude or OpenAI) based on task,
 * falling back to built-in mocks when API keys are not configured.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Provider routing:                                                      │
 * │                                                                        │
 * │  Claude API (ANTHROPIC_API_KEY)                                        │
 * │    • generateConcepts           — ad concept ideation                  │
 * │    • generateScript             — full ad script writing               │
 * │    • generateCreativeVariations — 10× variation generation             │
 * │    • applyTransform             — script tone/style transforms         │
 * │                                                                        │
 * │  OpenAI API (OPENAI_API_KEY)                                           │
 * │    • generateVOScript           — ElevenLabs emotion-tagged VO         │
 * │    • generateVisualPlan         — scene breakdown + shot list          │
 * │    • generateScenePromptPack    — image + Kling motion prompts         │
 * │                                                                        │
 * │  If the required API key is missing, each service falls back to its    │
 * │  built-in mock implementation (no external calls).                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ── Claude-routed services ──────────────────────────────────────────────

export { generateConcepts } from "./concept-generator";
export type { GenerateConceptsInput, GeneratedConcept } from "./concept-generator";

export { generateScript } from "./script-generator";
export type { GenerateScriptInput, GeneratedScript } from "./script-generator";

export { applyTransform, TRANSFORM_LABELS } from "./script-transforms";
export type {
  ScriptTransform,
  ScriptTransformInput,
  TransformedScript,
} from "./script-transforms";

export { generateCreativeVariations } from "./variation-generator";
export type { GenerateVariationsInput } from "./variation-generator";

// ── OpenAI-routed services ──────────────────────────────────────────────

export { generateVOScript, toPhoneticPhone } from "./vo-script-generator";
export type { GenerateVOScriptInput, GeneratedVOScript } from "./vo-script-generator";

export { generateVisualPlan } from "./visual-plan-generator";
export type {
  GenerateVisualPlanInput,
  GeneratedVisualPlan,
} from "./visual-plan-generator";

export { generateScenePromptPack } from "./scene-prompt-generator";
export type {
  GenerateScenePromptPackInput,
  GeneratedScenePromptPack,
} from "./scene-prompt-generator";

// ── Non-LLM services ───────────────────────────────────────────────────

export { buildSnapshot } from "./snapshot-builder";
