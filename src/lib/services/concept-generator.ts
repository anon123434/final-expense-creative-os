/**
 * Ad concept generation service.
 *
 * ── Provider: Claude API ─────────────────────────────────────────────────
 *
 * Generates 2–3 creative ad concepts from campaign context (persona,
 * archetype, emotional tone, triggers). Each concept includes hook,
 * emotional setup, conflict, solution, payoff, CTA, trigger map,
 * and visual world.
 *
 * Falls back to mock data when ANTHROPIC_API_KEY is not set.
 *
 * Interface contract:
 *   input:  GenerateConceptsInput  (campaign + triggers)
 *   output: GeneratedConcept[]
 */

import type { Campaign, CampaignTrigger } from "@/types";
import { isProviderConfigured, getProvider } from "@/lib/llm";

// ── Types ─────────────────────────────────────────────────────────────────

export interface GenerateConceptsInput {
  campaign: Campaign;
  triggers: CampaignTrigger[];
}

export interface GeneratedConcept {
  title: string;
  oneSentenceAngle: string;
  hook: string;
  emotionalSetup: string;
  conflict: string;
  solution: string;
  payoff: string;
  cta: string;
  triggerMap: Record<string, boolean>;
  visualWorld: string;
}

// ── System prompt ────────────────────────────────────────────────────────

const SYSTEM = `You are an elite direct-response advertising creative director specialising in final expense / burial insurance ads for television and social media.

Your job is to generate 2–3 distinct ad CONCEPTS for a campaign. Each concept is a complete creative idea — not a finished script, but a tight creative brief that a scriptwriter can execute.

For each concept output a JSON object with these fields:
  title            — short, punchy working title (5 words max)
  oneSentenceAngle — the core emotional lever in one sentence
  hook             — the opening line that stops the scroll / grabs attention
  emotionalSetup   — 1-2 sentences that establish the emotional world
  conflict         — the problem / tension the viewer relates to
  solution         — how the product resolves the conflict
  payoff           — the emotional resolution for the viewer
  cta              — a clear, specific call to action
  triggerMap       — object mapping trigger keys to true/false
  visualWorld      — short description of the visual setting / tone

Return a JSON array of concept objects. No markdown fences, no commentary — only valid JSON.`;

// ── Prompt builder ───────────────────────────────────────────────────────

function buildPrompt(input: GenerateConceptsInput): string {
  const { campaign, triggers } = input;
  const activeTriggers = triggers
    .filter((t) => t.included)
    .map((t) => t.triggerKey);

  return `Campaign context:
- Persona: ${campaign.personaId ?? "general"}
- Archetype: ${campaign.archetypeId ?? "general"}
- Emotional tone: ${campaign.emotionalTone ?? "empathetic and warm"}
- Offer: ${campaign.offerName ?? "Final Expense Coverage"}
- Benefit amount: ${campaign.benefitAmount ?? "$15,000"}
- Affordability: ${campaign.affordabilityText ?? "less than a dollar a day"}
- Phone: ${campaign.phoneNumber ?? "1-800-555-0100"}
- Deadline: ${campaign.deadlineText ?? "this month"}
- CTA style: ${campaign.ctaStyle ?? "call now"}
- Duration: ${campaign.durationSeconds ?? 30}s
- Active triggers: ${activeTriggers.join(", ") || "none specified"}
- All trigger keys: ${triggers.map((t) => t.triggerKey).join(", ")}
${campaign.notes ? `- Notes: ${campaign.notes}` : ""}

Generate 2–3 concepts. Each concept should use a distinctly different emotional angle or hook strategy while staying true to the persona and triggers.`;
}

// ── Response parser ──────────────────────────────────────────────────────

function parseResponse(text: string): GeneratedConcept[] {
  const trimmed = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");
  const parsed = JSON.parse(trimmed);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr.map((c: Record<string, unknown>) => ({
    title: String(c.title ?? "Untitled Concept"),
    oneSentenceAngle: String(c.oneSentenceAngle ?? ""),
    hook: String(c.hook ?? ""),
    emotionalSetup: String(c.emotionalSetup ?? ""),
    conflict: String(c.conflict ?? ""),
    solution: String(c.solution ?? ""),
    payoff: String(c.payoff ?? ""),
    cta: String(c.cta ?? ""),
    triggerMap: (c.triggerMap as Record<string, boolean>) ?? {},
    visualWorld: String(c.visualWorld ?? ""),
  }));
}

// ── Mock fallback ────────────────────────────────────────────────────────

function mockConcepts(input: GenerateConceptsInput): GeneratedConcept[] {
  const { campaign, triggers } = input;
  const triggerMap = Object.fromEntries(triggers.map((t) => [t.triggerKey, t.included]));
  const phone = campaign.phoneNumber ?? "1-800-555-0100";

  return [
    {
      title: "Don't Leave Your Family with the Burden",
      oneSentenceAngle: "Fear of financial burden on loved ones drives action.",
      hook: "What happens to your family when you're gone?",
      emotionalSetup: "A widow reflects on the bills that piled up after her husband passed.",
      conflict: "The average funeral costs over $8,000 — and most families aren't prepared.",
      solution: "A simple plan that costs less than a dollar a day.",
      payoff: "She made one phone call and protected her family forever.",
      cta: `Call ${phone} now to get your free information kit.`,
      triggerMap,
      visualWorld: "Warm kitchen, soft natural lighting, family photos on the wall",
    },
    {
      title: "The Promise She Kept",
      oneSentenceAngle: "A grandmother keeps her promise to never be a burden.",
      hook: "She promised her kids she'd never leave them with debt.",
      emotionalSetup: "A grandmother sits at her kitchen table, looking at old family photos.",
      conflict: "She didn't know how to keep that promise — until she saw this.",
      solution: "Guaranteed acceptance, no health questions, affordable monthly payment.",
      payoff: "Now her family will remember her love, not her bills.",
      cta: `Call ${phone} right now — the number on your screen.`,
      triggerMap,
      visualWorld: "Cozy living room, family gathering, golden hour window light",
    },
  ];
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Generates ad concepts for a campaign.
 * Uses Claude API when ANTHROPIC_API_KEY is set, otherwise returns mock data.
 */
export async function generateConcepts(
  input: GenerateConceptsInput
): Promise<GeneratedConcept[]> {
  // ── Claude API path ──────────────────────────────────────────────────
  if (isProviderConfigured("generateConcepts")) {
    try {
      const provider = getProvider("generateConcepts");
      const result = await provider.generate({
        system: SYSTEM,
        prompt: buildPrompt(input),
        temperature: 0.8,
      });
      return parseResponse(result.text);
    } catch (err) {
      console.error("[generateConcepts] Claude provider error, falling back to mock:", err);
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 1200));
  return mockConcepts(input);
}
