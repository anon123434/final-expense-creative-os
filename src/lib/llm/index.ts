/**
 * LLM provider registry and routing.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Task → Provider routing:                                              │
 * │                                                                        │
 * │  Claude API (ANTHROPIC_API_KEY)                                        │
 * │    • generateConcepts          — ad concept ideation                   │
 * │    • generateScript            — full ad script writing                │
 * │    • generateCreativeVariations — 10× variation generation             │
 * │    • applyTransform            — script tone/style transforms          │
 * │                                                                        │
 * │  OpenAI API (OPENAI_API_KEY)                                           │
 * │    • generateVOScript          — ElevenLabs emotion-tagged VO          │
 * │    • generateVisualPlan        — scene breakdown + shot list           │
 * │    • generateScenePromptPack   — image + Kling motion prompts          │
 * │                                                                        │
 * │  If the required API key is missing, generators fall back to their     │
 * │  built-in mock implementations (no external calls).                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Usage from a generator service:
 *
 *   import { getProvider, isProviderConfigured } from "@/lib/llm";
 *
 *   if (isProviderConfigured("generateScript")) {
 *     const provider = getProvider("generateScript");
 *     const result = await provider.generate({ system, prompt });
 *     return parseScriptResponse(result.text);
 *   }
 *   // … fall back to mock
 */

export type {
  LLMProvider,
  LLMGenerateOptions,
  LLMGenerateResult,
  LLMTask,
  ProviderBackend,
} from "./types";

export { TASK_PROVIDER_MAP } from "./types";

import type { LLMProvider, LLMTask } from "./types";
import { TASK_PROVIDER_MAP } from "./types";
import { claudeProvider, isClaudeConfigured, generateText } from "./providers/claude";

export { generateText } from "./providers/claude";
export type { GenerateTextOptions } from "./providers/claude";
import { openaiProvider, isOpenAIConfigured } from "./providers/openai";

export {
  generateText as generateTextWithOpenAI,
} from "./providers/openai";
export type {
  GenerateTextOptions as OpenAIGenerateTextOptions,
} from "./providers/openai";

// ── Provider registry ────────────────────────────────────────────────────

const providers: Record<string, LLMProvider> = {
  claude: claudeProvider,
  openai: openaiProvider,
};

const configChecks: Record<string, () => boolean> = {
  claude: isClaudeConfigured,
  openai: isOpenAIConfigured,
};

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Returns true if the provider for a given task has its API key configured.
 * When false, the generator should use its mock fallback.
 */
export function isProviderConfigured(task: LLMTask): boolean {
  const backend = TASK_PROVIDER_MAP[task];
  return configChecks[backend]();
}

/**
 * Returns the LLMProvider instance for a given task.
 * Throws if the provider is not configured — always check
 * `isProviderConfigured` first.
 */
export function getProvider(task: LLMTask): LLMProvider {
  const backend = TASK_PROVIDER_MAP[task];
  if (!configChecks[backend]()) {
    throw new Error(
      `Provider "${backend}" is not configured for task "${task}". ` +
      `Set the required environment variable (ANTHROPIC_API_KEY / OPENAI_API_KEY).`
    );
  }
  return providers[backend];
}
