/**
 * OpenAI provider.
 *
 * Used for production / structured output tasks:
 *   - generateVOScript   (ElevenLabs-ready emotion-tagged script)
 *   - generateVisualPlan
 *   - generateScenePromptPack
 *
 * Requires OPENAI_API_KEY environment variable.
 * Model and defaults configured in /lib/config/models.ts.
 */

import OpenAI from "openai";
import {
  APIError,
  AuthenticationError,
  RateLimitError,
  APIConnectionError,
} from "openai";
import type { LLMProvider, LLMGenerateOptions, LLMGenerateResult } from "../types";
import { resolveOpenAIApiKey, hasOpenAIKey } from "@/lib/config/env";
import {
  OPENAI_MODEL,
  OPENAI_MAX_TOKENS,
  OPENAI_DEFAULT_TEMPERATURE,
} from "@/lib/config/models";

// ── Client singleton ─────────────────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = resolveOpenAIApiKey();
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it in Settings or your .env.local file."
      );
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/** Clear the cached client so the next call picks up fresh API keys. */
export function resetClient(): void {
  _client = null;
}

// ── Config check ─────────────────────────────────────────────────────────

export function isOpenAIConfigured(): boolean {
  return hasOpenAIKey();
}

// ── Error handling ───────────────────────────────────────────────────────

/**
 * Converts OpenAI SDK errors into plain Error instances with
 * human-readable messages. Non-SDK errors pass through unchanged.
 */
function classifyError(error: unknown): never {
  // Our own errors (e.g. empty-response) — pass through.
  if (error instanceof Error && !(error instanceof APIError)) {
    throw error;
  }

  if (error instanceof AuthenticationError) {
    throw new Error(
      "OpenAI authentication failed — verify OPENAI_API_KEY is valid."
    );
  }

  if (error instanceof RateLimitError) {
    throw new Error(
      "OpenAI rate limit exceeded. Please wait a moment and try again."
    );
  }

  if (error instanceof APIConnectionError) {
    throw new Error(
      "Could not connect to the OpenAI API. Check your network connection."
    );
  }

  if (error instanceof APIError) {
    throw new Error(
      `OpenAI API error (${error.status}): ${error.message}`
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
 * Makes a single OpenAI Chat Completions API call and returns the raw response.
 * Handles all SDK error classification.
 */
async function callOpenAI(
  options: CallOptions,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const client = getClient();

  try {
    return await client.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: options.maxTokens ?? OPENAI_MAX_TOKENS,
      temperature: options.temperature ?? OPENAI_DEFAULT_TEMPERATURE,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.prompt },
      ],
    });
  } catch (error) {
    classifyError(error);
  }
}

/** Extracts text content from a ChatCompletion, or throws if empty. */
function extractText(
  response: OpenAI.Chat.Completions.ChatCompletion,
): string {
  const text = response.choices[0]?.message?.content ?? "";

  if (!text) {
    const reason = response.choices[0]?.finish_reason ?? "unknown";
    throw new Error(
      `OpenAI returned an empty response (finish_reason: ${reason}).`
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
  /** Max output tokens. Defaults to OPENAI_MAX_TOKENS (4096). */
  maxTokens?: number;
  /** Sampling temperature 0-1. Defaults to OPENAI_DEFAULT_TEMPERATURE (0.6). */
  temperature?: number;
}

/**
 * Send a single system + user prompt to OpenAI and return plain text.
 *
 * This is the low-level building block that every OpenAI-powered generator
 * calls. It handles:
 *   - client construction & API-key validation
 *   - OpenAI SDK error classification (auth, rate-limit, network, etc.)
 *   - empty-response detection
 *
 * Throws a descriptive `Error` for every failure path so callers can catch
 * at the boundary and fall back to mocks when appropriate.
 */
export async function generateText(options: GenerateTextOptions): Promise<string> {
  const response = await callOpenAI(options);
  return extractText(response);
}

// ── Public: LLMProvider (used by the router in /lib/llm/index.ts) ────────

export const openaiProvider: LLMProvider = {
  name: "openai",

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const response = await callOpenAI(options);
    const text = extractText(response);

    return {
      text,
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
      },
    };
  },
};
