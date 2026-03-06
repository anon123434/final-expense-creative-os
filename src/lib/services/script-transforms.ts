/**
 * Script transform service.
 *
 * ── Provider: Claude API ─────────────────────────────────────────────────
 *
 * Each transform takes the CURRENT edited script content and returns
 * a modified version applying the requested tone/style change.
 *
 * Falls back to deterministic string manipulation when ANTHROPIC_API_KEY
 * is not set.
 *
 * Interface contract:
 *   input:  ScriptTransformInput  (current text + transform type + campaign context)
 *   output: TransformedScript     (modified hook, body, cta, full_script)
 */

import type { Campaign } from "@/types";
import { isProviderConfigured, getProvider } from "@/lib/llm";

// ── Types ─────────────────────────────────────────────────────────────────

export type ScriptTransform =
  | "regenerate"
  | "more_urgent"
  | "more_emotional"
  | "more_authority"
  | "simplify"
  | "shorter"
  | "longer";

export interface ScriptTransformInput {
  campaign: Campaign;
  currentHook: string;
  currentBody: string;
  currentCta: string;
  transform: ScriptTransform;
}

export interface TransformedScript {
  hook: string;
  body: string;
  cta: string;
  fullScript: string;
  transformApplied: ScriptTransform;
  metadata: Record<string, unknown>;
}

// ── System prompt ────────────────────────────────────────────────────────

const SYSTEM = `You are an elite direct-response ad scriptwriter. You will receive an existing final expense insurance ad script and a requested transform. Apply the transform while keeping the script's core message and persona intact.

Return a JSON object:
{
  "hook": "...",
  "body": "...",
  "cta": "..."
}

No markdown fences, no commentary — only valid JSON.`;

// ── Transform descriptions ───────────────────────────────────────────────

const TRANSFORM_INSTRUCTIONS: Record<ScriptTransform, string> = {
  regenerate: "Completely rewrite the script with a fresh angle while keeping the same persona, offer, and CTA phone number.",
  more_urgent: "Increase urgency. Add time pressure. Make the stakes feel immediate. Don't be salesy — be real.",
  more_emotional: "Deepen the emotional resonance. Make the viewer feel the weight of the decision. Add specificity to the emotional moments.",
  more_authority: "Add authority and credibility markers. Reference regulation, carrier ratings, or social proof. Keep it natural, not corporate.",
  simplify: "Simplify the language. Shorter sentences. Fewer syllables. A 5th grader should understand every line.",
  shorter: "Cut the script by roughly 30%. Keep the strongest lines. Remove anything redundant.",
  longer: "Expand the script by roughly 30%. Add one more proof point or emotional beat. Don't pad — add substance.",
};

// ── Prompt builder ───────────────────────────────────────────────────────

function buildPrompt(input: ScriptTransformInput): string {
  const { campaign, currentHook, currentBody, currentCta, transform } = input;

  return `Campaign context:
- Persona: ${campaign.personaId ?? "general"}
- Phone: ${campaign.phoneNumber ?? "1-800-555-0100"}
- Benefit: ${campaign.benefitAmount ?? "$15,000"}
- Deadline: ${campaign.deadlineText ?? "this month"}

Current script:
HOOK: ${currentHook}
BODY: ${currentBody}
CTA: ${currentCta}

Transform requested: "${transform}"
Instructions: ${TRANSFORM_INSTRUCTIONS[transform]}

Apply the transform now.`;
}

// ── Response parser ──────────────────────────────────────────────────────

function parseResponse(text: string, transform: ScriptTransform): TransformedScript {
  const trimmed = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");
  const parsed = JSON.parse(trimmed);
  const hook = String(parsed.hook ?? "");
  const body = String(parsed.body ?? "");
  const cta = String(parsed.cta ?? "");
  return {
    hook,
    body,
    cta,
    fullScript: `${hook}\n\n${body}\n\n${cta}`,
    transformApplied: transform,
    metadata: { provider: "claude", appliedAt: new Date().toISOString() },
  };
}

// ── Mock transform helpers ───────────────────────────────────────────────

function addUrgency(text: string): string {
  const urgencyPhrases = ["Right now.", "Don't wait.", "Today — not tomorrow."];
  const phrase = urgencyPhrases[Math.floor(Math.random() * urgencyPhrases.length)];
  return text.trimEnd() + ` ${phrase}`;
}

function addEmotion(text: string, campaign: Campaign): string {
  const family = "your children, your grandchildren — the people who depend on you";
  if (text.includes("family")) return text.replace("family", family);
  return `Think about the people you love most. ` + text;
}

function addAuthority(text: string): string {
  const markers = [
    "Licensed agents. State-regulated coverage.",
    "A-rated carriers. Fully licensed and regulated.",
    "Trusted by over 500,000 families nationwide.",
  ];
  const marker = markers[Math.floor(Math.random() * markers.length)];
  return text.trimEnd() + ` ${marker}`;
}

function simplifyText(text: string): string {
  return text
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.length > 80 ? s.split(",")[0].trim() : s))
    .slice(0, 3)
    .join(". ")
    .trimEnd() + ".";
}

function shortenText(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const keep = Math.max(1, Math.ceil(sentences.length * 0.7));
  return sentences.slice(0, keep).join(" ");
}

function lengthenText(text: string, campaign: Campaign): string {
  const extensions = [
    `And the best part? There's no medical exam required.`,
    `Coverage starts immediately. Your family is protected from day one.`,
    `In fact, most people are approved in just minutes over the phone.`,
    campaign.affordabilityText
      ? `At ${campaign.affordabilityText}, it fits any budget.`
      : `Rates start as low as you'd expect — less than you spend on coffee each week.`,
  ];
  const ext = extensions[Math.floor(Math.random() * extensions.length)];
  return text.trimEnd() + ` ${ext}`;
}

function mockTransform(input: ScriptTransformInput): TransformedScript {
  const { currentHook, currentBody, currentCta, transform, campaign } = input;

  let hook = currentHook;
  let body = currentBody;
  let cta = currentCta;

  switch (transform) {
    case "regenerate":
      hook = `Have you thought about what happens to your family's finances when you're gone?`;
      body = lengthenText(addEmotion(currentBody, campaign), campaign);
      cta = `Call the number on your screen. One call. ${campaign.durationSeconds ?? 30} seconds. That's all it takes.`;
      break;
    case "more_urgent":
      hook = addUrgency(currentHook);
      body = body.replace(/\. /g, ". ").split(". ").join(".\n").trimEnd();
      cta = addUrgency(currentCta);
      break;
    case "more_emotional":
      hook = addEmotion(currentHook, campaign);
      body = addEmotion(currentBody, campaign);
      cta = `Do it for them. ` + currentCta;
      break;
    case "more_authority":
      hook = currentHook;
      body = addAuthority(currentBody);
      cta = addAuthority(currentCta);
      break;
    case "simplify":
      hook = simplifyText(currentHook);
      body = simplifyText(currentBody);
      cta = simplifyText(currentCta);
      break;
    case "shorter":
      hook = shortenText(currentHook);
      body = shortenText(currentBody);
      cta = shortenText(currentCta);
      break;
    case "longer":
      hook = currentHook;
      body = lengthenText(currentBody, campaign);
      cta = lengthenText(currentCta, campaign);
      break;
  }

  return {
    hook,
    body,
    cta,
    fullScript: `${hook}\n\n${body}\n\n${cta}`,
    transformApplied: transform,
    metadata: { transform, appliedAt: new Date().toISOString() },
  };
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Applies a style/tone transform to an existing script.
 * Uses Claude API when ANTHROPIC_API_KEY is set, otherwise uses deterministic mock transforms.
 */
export async function applyTransform(input: ScriptTransformInput): Promise<TransformedScript> {
  // ── Claude API path ──────────────────────────────────────────────────
  if (isProviderConfigured("applyTransform")) {
    try {
      const provider = getProvider("applyTransform");
      const result = await provider.generate({
        system: SYSTEM,
        prompt: buildPrompt(input),
        temperature: 0.7,
      });
      return parseResponse(result.text, input.transform);
    } catch (err) {
      console.error("[applyTransform] Claude provider error, falling back to mock:", err);
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 900));
  return mockTransform(input);
}

export const TRANSFORM_LABELS: Record<ScriptTransform, string> = {
  regenerate: "Regenerate",
  more_urgent: "More Urgent",
  more_emotional: "More Emotional",
  more_authority: "More Authority",
  simplify: "Simplify",
  shorter: "Shorter",
  longer: "Longer",
};
