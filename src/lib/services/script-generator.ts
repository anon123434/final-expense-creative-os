/**
 * Script generation service.
 *
 * ── Provider: Claude API ─────────────────────────────────────────────────
 *
 * Takes campaign context + selected concept and writes a complete
 * direct-response ad script (hook, body, CTA).
 *
 * Falls back to mock data when ANTHROPIC_API_KEY is not set.
 *
 * Interface contract:
 *   input:  GenerateScriptInput  (campaign context + concept)
 *   output: GeneratedScript      (hook, body, cta, full_script, version_name)
 */

import type { Campaign } from "@/types";
import type { AdConcept } from "@/types";
import { isProviderConfigured, getProvider } from "@/lib/llm";

// ── Types ─────────────────────────────────────────────────────────────────

export interface GenerateScriptInput {
  campaign: Campaign;
  concept: AdConcept;
  durationSeconds?: number;
}

export interface GeneratedScript {
  versionName: string;
  hook: string;
  body: string;
  cta: string;
  fullScript: string;
  durationSeconds: number;
  metadata: Record<string, unknown>;
}

// ── System prompt ────────────────────────────────────────────────────────

const SYSTEM = `You are an elite direct-response advertising scriptwriter specialising in final expense / burial insurance ads.

Given a campaign brief and a creative concept, write a complete ad script with three sections:
  hook — 1-2 sentences that grab attention immediately
  body — 3-5 sentences that build emotional connection and present the offer
  cta  — 1-2 sentences with a clear, urgent call to action

Write in a conversational, authentic voice that matches the persona. No jargon. Short sentences. Real emotion.

Return a JSON object:
{
  "versionName": "short version label",
  "hook": "...",
  "body": "...",
  "cta": "..."
}

No markdown fences, no commentary — only valid JSON.`;

// ── Prompt builder ───────────────────────────────────────────────────────

function buildPrompt(input: GenerateScriptInput): string {
  const { campaign, concept, durationSeconds = 30 } = input;

  return `Campaign:
- Persona: ${campaign.personaId ?? "general"}
- Emotional tone: ${campaign.emotionalTone ?? "empathetic"}
- Phone: ${campaign.phoneNumber ?? "1-800-555-0100"}
- Benefit: ${campaign.benefitAmount ?? "$15,000"}
- Affordability: ${campaign.affordabilityText ?? "less than a dollar a day"}
- Deadline: ${campaign.deadlineText ?? "this month"}
- CTA style: ${campaign.ctaStyle ?? "call now"}
- Duration target: ${durationSeconds}s

Concept: "${concept.title}"
- Angle: ${concept.oneSentenceAngle ?? ""}
- Hook direction: ${concept.hook ?? ""}
- Emotional setup: ${concept.emotionalSetup ?? ""}
- Conflict: ${concept.conflict ?? ""}
- Solution: ${concept.solution ?? ""}
- Payoff: ${concept.payoff ?? ""}
- CTA direction: ${concept.cta ?? ""}

Write the script now.`;
}

// ── Response parser ──────────────────────────────────────────────────────

function parseResponse(text: string, durationSeconds: number): GeneratedScript {
  const trimmed = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");
  const parsed = JSON.parse(trimmed);
  const hook = String(parsed.hook ?? "");
  const body = String(parsed.body ?? "");
  const cta = String(parsed.cta ?? "");
  return {
    versionName: String(parsed.versionName ?? "V1"),
    hook,
    body,
    cta,
    fullScript: `${hook}\n\n${body}\n\n${cta}`,
    durationSeconds,
    metadata: { provider: "claude", generatedAt: new Date().toISOString() },
  };
}

// ── Mock fallback ────────────────────────────────────────────────────────

const MOCK_VARIANTS: Array<(input: GenerateScriptInput) => GeneratedScript> = [
  ({ campaign, concept, durationSeconds = 30 }) => {
    const phone = campaign.phoneNumber ?? "1-800-555-0100";
    const benefit = campaign.benefitAmount ?? "$10,000";
    const hook = concept.hook ?? "What happens to your family when you're gone?";
    const body = [
      concept.emotionalSetup ?? "Every year, thousands of families are left struggling to cover funeral costs.",
      concept.conflict ?? `The average funeral costs over $8,000 — and most families have no plan.`,
      concept.solution ?? `But there's a simple, affordable way to protect your family. Final expense coverage starts at less than a dollar a day.`,
      concept.payoff ?? "One phone call is all it takes. No medical exam. Guaranteed acceptance.",
    ].join(" ");
    const cta = concept.cta ?? `Call ${phone} right now. Don't leave your family with that burden.`;
    return {
      versionName: `V1 — ${concept.title}`,
      hook,
      body,
      cta,
      fullScript: `${hook}\n\n${body}\n\n${cta}`,
      durationSeconds,
      metadata: { variant: 1, generatedAt: new Date().toISOString() },
    };
  },
  ({ campaign, concept, durationSeconds = 30 }) => {
    const phone = campaign.phoneNumber ?? "1-800-555-0100";
    const affordability = campaign.affordabilityText ?? "less than a dollar a day";
    const hook = `If something happened to you today — would your family be okay?`;
    const body = [
      concept.emotionalSetup ?? "It's the question no one wants to answer.",
      `Funeral costs average over $8,000. Most families aren't prepared.`,
      concept.solution ?? `Final expense insurance gives your family the gift of time — time to grieve, not scramble.`,
      `Coverage starts at ${affordability}. No health questions. No waiting period.`,
    ].join(" ");
    const cta = `Call ${phone} now and get your free information kit. Lines close at midnight.`;
    return {
      versionName: `V2 — Family Security`,
      hook,
      body,
      cta,
      fullScript: `${hook}\n\n${body}\n\n${cta}`,
      durationSeconds,
      metadata: { variant: 2, generatedAt: new Date().toISOString() },
    };
  },
];

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Generates a complete ad script from campaign + concept.
 * Uses Claude API when ANTHROPIC_API_KEY is set, otherwise returns mock data.
 */
export async function generateScript(input: GenerateScriptInput): Promise<GeneratedScript> {
  const duration = input.durationSeconds ?? 30;

  // ── Claude API path ──────────────────────────────────────────────────
  if (isProviderConfigured("generateScript")) {
    try {
      const provider = getProvider("generateScript");
      const result = await provider.generate({
        system: SYSTEM,
        prompt: buildPrompt(input),
        temperature: 0.7,
      });
      return parseResponse(result.text, duration);
    } catch (err) {
      console.error("[generateScript] Claude provider error, falling back to mock:", err);
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 1200));
  const id = input.concept.id;
  const idx = id.charCodeAt(id.length - 1) % MOCK_VARIANTS.length;
  return MOCK_VARIANTS[idx](input);
}
