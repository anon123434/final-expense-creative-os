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
import type { TriggerSequenceContext } from "@/lib/services/trigger-sequencer";

// ── Types ─────────────────────────────────────────────────────────────────

export interface GenerateScriptInput {
  campaign: Campaign;
  concept: AdConcept;
  durationSeconds?: number;
  customPrompt?: string;
  triggerSequence?: TriggerSequenceContext;  // from trigger-sequencer
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

CRITICAL — OUTPUT FORMAT:
You are writing the ACTUAL WORDS spoken aloud by the persona in the ad.
NEVER write stage directions, narrative descriptions, or third-person summaries.
NEVER write things like "A widow reflects on..." or "She remembers when..." or "The narrator says..."
Every word you write will be read aloud exactly as written. Write it as if the persona is speaking directly into the camera to the viewer right now.

Every winning script you write layers in these 12 psychological triggers — use as many as naturally fit the concept:

1. Authority         — a credible source delivers the information (state worker, pastor, nurse, veteran)
2. Scarcity          — limited knowledge, deadline, or access ("they don't advertise this publicly")
3. Social proof      — the persona or someone they know already got approved easily
4. Loss aversion     — vivid picture of what happens to the family without coverage (debt, burden)
5. Guilt avoidance   — frame coverage as protecting children / not being a burden
6. Insider knowledge — position the benefit as something insiders know but most people miss
7. Simplicity        — two questions, five minutes, no medical exam, no waiting period
8. Affordability     — reframe the cost as a tiny daily amount ($2/day, less than a coffee)
9. Value disparity   — contrast the tiny cost against the large payout ($2/day → $25,000)
10. Legitimacy       — state-approved, benefit not insurance, government-connected language
11. Urgency          — hard deadline (Friday 6pm, this month, lines close tonight)
12. Autonomy         — nobody will do this for you; you must act yourself

Script structure (sentence counts vary by duration — follow the target in the prompt):
  hook — Grab attention. Lead with Authority + Insider Knowledge.
  body — Stack Loss Aversion, Guilt Avoidance, Social Proof, Simplicity, Affordability, Value Disparity, Legitimacy. Use as many sentences as the word count target requires.
  cta  — Urgency + Autonomy. Include phone number.

Example of CORRECT output (first-person spoken words):
  hook: "My son works for the state and he just told me something unbelievable."
  body: "There's a twenty-five thousand dollar final expense benefit available to Americans over fifty — and they don't advertise it. Most families don't find out until it's too late. I answered two questions, got approved the same day, and it costs me less than two dollars a day. Two questions. That's all it took."
  cta: "This offer closes Friday. Call 1-877-816-0562 right now — nobody is going to do this for you."

Example of WRONG output (never do this):
  hook: "A widow reflects on the financial burden her family faced after her husband passed."

Additional rules:
- Write in the persona's authentic voice — first-person ("I", "my", "we") or direct address ("you", "your family").
- Short sentences. Real emotion. No corporate jargon.
- Never say "insurance" — use "benefit", "coverage", "protection", or "plan".
- NEVER say "no medical exam", "no health check", "no physical", "no doctor", or any variation — these phrases attract unhealthy leads. Instead emphasize ease and speed: "two questions", "approved the same day", "one phone call", "simple process".
- Phone number must appear in the CTA.
- STRICTLY hit the word count target in the prompt — this determines broadcast length. Shorter or longer scripts waste media budget.

90-SECOND CTA RULES (apply only when duration is 90 seconds):
- Phone number MUST appear exactly TWICE in the CTA section.
- Immediately after the first mention, write: "Write that down." as its own sentence.
- Between the two mentions: one emotional resolve line (guilt_avoidance or loss_aversion tone), then one final urgency line with specific deadline.
- After the second mention: one simplicity or autonomy close ("The call is free." or similar).
- Never place both phone mentions back-to-back without at least 4 words between them.
30s and 60s scripts: phone number appears exactly ONCE, at the end of the CTA.

Return a JSON object:
{
  "versionName": "short version label",
  "hook": "...",
  "body": "...",
  "cta": "..."
}

No markdown fences, no commentary — only valid JSON.`;

// ── Prompt builder ───────────────────────────────────────────────────────

const DEFAULT_TRIGGER_HINT = `- Hook  → lead with Authority or Insider Knowledge; add Scarcity hint
- Body  → weave in Loss Aversion, Guilt Avoidance, Social Proof, Simplicity, Affordability ($2/day), Value Disparity ($2 → {benefitAmount}), Legitimacy
- CTA   → close with hard Urgency ({deadlineText}), Autonomy ("nobody will do this for you"), phone number`;

// ~150 words per minute for a natural spoken pace
const DURATION_GUIDE: Record<number, { words: number; hookSentences: string; bodySentences: string; ctaSentences: string }> = {
  30: { words: 75,  hookSentences: "1–2", bodySentences: "3–5",  ctaSentences: "1–2" },
  60: { words: 150, hookSentences: "2–3", bodySentences: "6–9",  ctaSentences: "2–3" },
  90: { words: 225, hookSentences: "2–3", bodySentences: "10–14", ctaSentences: "2–3" },
};

function buildPrompt(input: GenerateScriptInput): string {
  const { campaign, concept, durationSeconds = 30, customPrompt } = input;
  const guide = DURATION_GUIDE[durationSeconds] ?? DURATION_GUIDE[30];

  const fallbackHint = DEFAULT_TRIGGER_HINT
    .replace("{benefitAmount}", campaign.benefitAmount ?? "$25,000")
    .replace("{deadlineText}", campaign.deadlineText ?? "deadline");
  const triggerBlock = input.triggerSequence?.sequenceText ?? fallbackHint;

  return `Campaign:
- Persona: ${campaign.personaId ?? "general"}
- Emotional tone: ${campaign.emotionalTone ?? "empathetic"}
- Phone: ${campaign.phoneNumber ?? "1-800-555-0100"}
- Benefit: ${campaign.benefitAmount ?? "$15,000"}
- Affordability: ${campaign.affordabilityText ?? "less than a dollar a day"}
- Deadline: ${campaign.deadlineText ?? "this month"}
- CTA style: ${campaign.ctaStyle ?? "call now"}

DURATION TARGET: ${durationSeconds} seconds
WORD COUNT TARGET: ~${guide.words} words total across hook + body + cta (spoken at ~150 wpm)
  - hook: ${guide.hookSentences} sentences
  - body: ${guide.bodySentences} sentences  ← expand the story here to fill the runtime
  - cta:  ${guide.ctaSentences} sentences

Concept: "${concept.title}"
- Angle: ${concept.oneSentenceAngle ?? ""}
- Hook direction: ${concept.hook ?? ""}
- Emotional setup: ${concept.emotionalSetup ?? ""}
- Conflict: ${concept.conflict ?? ""}
- Solution: ${concept.solution ?? ""}
- Payoff: ${concept.payoff ?? ""}
- CTA direction: ${concept.cta ?? ""}

Trigger layering guide:
${triggerBlock}

${customPrompt ? `\nSPECIAL INSTRUCTIONS (follow these exactly, they override defaults above):\n${customPrompt}\n` : ""}Write the script now. Hit the word count target.`;
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
    const benefit = campaign.benefitAmount ?? "$25,000";
    const affordability = campaign.affordabilityText ?? "less than a dollar a day";
    const deadline = campaign.deadlineText ?? "this Friday";
    const hook = concept.hook ?? "My son works for the state and he just told me something I couldn't believe.";
    const body = [
      `There's a ${benefit} final expense benefit available to Americans over fifty — and they don't advertise it.`,
      concept.emotionalSetup ?? "When my husband passed, the bills nearly broke us. I swore I'd never do that to my kids.",
      concept.solution ?? `I answered two questions over the phone and got approved the same day.`,
      `It costs ${affordability}. That's it. For ${benefit} in coverage for your family.`,
      concept.payoff ?? "One call and my family is protected. That peace of mind is priceless.",
    ].join(" ");
    const cta = `This closes ${deadline}. Call ${phone} right now — nobody is going to do this for you.`;
    return {
      versionName: `V1 — ${concept.title}`,
      hook,
      body,
      cta,
      fullScript: `${hook}\n\n${body}\n\n${cta}`,
      durationSeconds,
      metadata: { provider: "mock", variant: 1, generatedAt: new Date().toISOString() },
    };
  },
  ({ campaign, concept, durationSeconds = 30 }) => {
    const phone = campaign.phoneNumber ?? "1-800-555-0100";
    const benefit = campaign.benefitAmount ?? "$25,000";
    const affordability = campaign.affordabilityText ?? "two dollars a day";
    const deadline = campaign.deadlineText ?? "this Friday at six p.m.";
    const hook = `If something happened to you today — would your family be okay?`;
    const body = [
      `I didn't want to think about it either. But my daughter asked me that question and I didn't have an answer.`,
      concept.conflict ?? `Funerals cost over $8,000. Most families have nothing set aside. That burden falls on your kids.`,
      concept.solution ?? `I found a state-approved benefit — not insurance, a benefit — that covers everything.`,
      `${affordability}. That gives your family ${benefit}. I got approved in one phone call. Two questions. That's it.`,
    ].join(" ");
    const cta = `Call ${phone} before ${deadline}. Write it down. Call right now.`;
    return {
      versionName: `V2 — Family Security`,
      hook,
      body,
      cta,
      fullScript: `${hook}\n\n${body}\n\n${cta}`,
      durationSeconds,
      metadata: { provider: "mock", variant: 2, generatedAt: new Date().toISOString() },
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[generateScript] Claude provider error, falling back to mock:", msg);
      // Re-throw auth errors so the UI can surface them rather than silently using mock
      if (msg.includes("authentication") || msg.includes("401") || msg.includes("Invalid API Key")) {
        throw new Error(`Claude API key is invalid — update it in Settings. (${msg})`);
      }
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 1200));
  const id = input.concept.id;
  const idx = id.charCodeAt(id.length - 1) % MOCK_VARIANTS.length;
  return MOCK_VARIANTS[idx](input);
}
