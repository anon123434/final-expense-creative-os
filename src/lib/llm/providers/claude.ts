/**
 * Claude (Anthropic) provider.
 *
 * Used for creative strategy tasks:
 *   - generateConcepts
 *   - generateScript
 *   - generateCreativeVariations
 *   - applyTransform
 *
 * Requires ANTHROPIC_API_KEY environment variable.
 * Model and defaults configured in /lib/config/models.ts.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  APIError,
  AuthenticationError,
  RateLimitError,
  APIConnectionError,
} from "@anthropic-ai/sdk";
import type { LLMProvider, LLMGenerateOptions, LLMGenerateResult } from "../types";
import { resolveAnthropicApiKey, hasAnthropicKey } from "@/lib/config/env";
import {
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS,
  CLAUDE_DEFAULT_TEMPERATURE,
} from "@/lib/config/models";

// ── Client factory ────────────────────────────────────────────────────────
// No caching — creating an Anthropic instance is a cheap config operation,
// not a network call. Always resolving fresh from the settings cache ensures
// updated keys are picked up immediately without module restart.

function getClient(): Anthropic {
  const apiKey = resolveAnthropicApiKey();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it in Settings or your .env.local file."
    );
  }
  return new Anthropic({ apiKey });
}

/** No-op — kept for API compatibility. No client to reset. */
export function resetClient(): void {}

// ── Config check ─────────────────────────────────────────────────────────

export function isClaudeConfigured(): boolean {
  return hasAnthropicKey();
}

// ── Error handling ───────────────────────────────────────────────────────

/**
 * Converts Anthropic SDK errors into plain Error instances with
 * human-readable messages. Non-SDK errors pass through unchanged.
 */
function classifyError(error: unknown): never {
  // Our own errors (e.g. empty-response) — pass through.
  if (error instanceof Error && !(error instanceof APIError)) {
    throw error;
  }

  if (error instanceof AuthenticationError) {
    throw new Error(
      "Claude authentication failed — verify ANTHROPIC_API_KEY is valid."
    );
  }

  if (error instanceof RateLimitError) {
    throw new Error(
      "Claude rate limit exceeded. Please wait a moment and try again."
    );
  }

  if (error instanceof APIConnectionError) {
    throw new Error(
      "Could not connect to the Anthropic API. Check your network connection."
    );
  }

  if (error instanceof APIError) {
    throw new Error(
      `Claude API error (${error.status}): ${error.message}`
    );
  }

  // Truly unexpected — re-throw as-is.
  throw error;
}

// ── Core call ────────────────────────────────────────────────────────────

interface CallOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Makes a single Claude Messages API call and returns the raw response.
 * Handles all SDK error classification.
 */
async function callClaude(options: CallOptions): Promise<Anthropic.Message> {
  const client = getClient();

  try {
    return await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: options.maxTokens ?? CLAUDE_MAX_TOKENS,
      temperature: options.temperature ?? CLAUDE_DEFAULT_TEMPERATURE,
      system: options.system,
      messages: [{ role: "user", content: options.prompt }],
    });
  } catch (error) {
    classifyError(error);
  }
}

/** Extracts joined text from a Claude Message, or throws if empty. */
function extractText(response: Anthropic.Message): string {
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (!text) {
    throw new Error(
      `Claude returned an empty response (stop_reason: ${response.stop_reason}).`
    );
  }

  return text;
}

// ── Public: standalone generateText ──────────────────────────────────────

export interface GenerateTextOptions {
  /** System-level instructions / persona. */
  system: string;
  /** The user-facing prompt with all task context. */
  prompt: string;
  /** Max output tokens. Defaults to CLAUDE_MAX_TOKENS (4096). */
  maxTokens?: number;
  /** Sampling temperature 0-1. Defaults to CLAUDE_DEFAULT_TEMPERATURE (0.7). */
  temperature?: number;
}

/**
 * Send a single system + user prompt to Claude and return plain text.
 *
 * This is the low-level building block that every Claude-powered generator
 * calls. It handles:
 *   - client construction & API-key validation
 *   - Anthropic SDK error classification (auth, rate-limit, network, etc.)
 *   - empty-response detection
 *
 * Throws a descriptive `Error` for every failure path so callers can catch
 * at the boundary and fall back to mocks when appropriate.
 */
export async function generateText(options: GenerateTextOptions): Promise<string> {
  const response = await callClaude(options);
  return extractText(response);
}

// ── Public: LLMProvider (used by the router in /lib/llm/index.ts) ────────

export const claudeProvider: LLMProvider = {
  name: "claude",

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const response = await callClaude(options);
    const text = extractText(response);

    return {
      text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  },
};
