/**
 * Resets cached LLM client singletons so they pick up new API keys.
 * Called after settings are saved.
 */

import { resetClient as resetOpenAIClient } from "./openai";
import { resetClient as resetClaudeClient } from "./claude";

export function resetLLMClients(): void {
  resetOpenAIClient();
  resetClaudeClient();
}
