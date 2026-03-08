/**
 * Voiceover script generation service.
 *
 * ── Provider: OpenAI API ─────────────────────────────────────────────────
 *
 * Takes a finalized script + campaign context and returns an ElevenLabs-ready
 * tagged voiceover script with emotion markers, delivery notes, and a voice
 * profile suggestion.
 *
 * Falls back to deterministic tagging when OPENAI_API_KEY is not set.
 *
 * Interface contract:
 *   input:  GenerateVOScriptInput  (script sections + campaign)
 *   output: GeneratedVOScript      (taggedScript, voiceProfile, deliveryNotes, phoneticPhone)
 *
 * ElevenLabs emotion tag format:
 *   <emotion description>
 *   Text to be spoken...
 */

import type { Campaign } from "@/types";
import { generateTextWithOpenAI } from "@/lib/llm";
import { isProviderConfigured } from "@/lib/llm";

// ── Types ─────────────────────────────────────────────────────────────────

export interface GenerateVOScriptInput {
  campaign: Campaign;
  hook: string;
  body: string;
  cta: string;
}

export interface GeneratedVOScript {
  taggedScript: string;
  voiceProfile: string;
  deliveryNotes: string;
  phoneticPhone: string | null;
  provider: "openai" | "mock";
}

// ── Phonetic phone number ─────────────────────────────────────────────────

/**
 * Converts a US phone number into a naturally spoken phonetic form.
 * "1-800-555-0132" → "one eight hundred. five five five. oh one three two."
 */
export function toPhoneticPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  const words: Record<string, string> = {
    "0": "oh", "1": "one", "2": "two", "3": "three", "4": "four",
    "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
  };

  const speakDigits = (chunk: string) =>
    chunk.split("").map((d) => words[d] ?? d).join(" ");

  // Handle 1-800/1-888/1-877/1-866 style toll-free
  if (digits.length === 11 && digits[0] === "1") {
    const areaCode = digits.slice(1, 4);
    const exchange = digits.slice(4, 7);
    const line = digits.slice(7);
    const areaSpoken =
      areaCode === "800" ? "eight hundred" :
      areaCode === "888" ? "eight eight eight" :
      areaCode === "877" ? "eight seven seven" :
      areaCode === "866" ? "eight six six" :
      speakDigits(areaCode);
    return `one ${areaSpoken}. ${speakDigits(exchange)}. ${speakDigits(line)}.`;
  }

  // 10-digit local
  if (digits.length === 10) {
    return `${speakDigits(digits.slice(0, 3))}. ${speakDigits(digits.slice(3, 6))}. ${speakDigits(digits.slice(6))}.`;
  }

  // Fallback — speak each digit
  return speakDigits(digits) + ".";
}

// ── Voice profile suggestions ─────────────────────────────────────────────

const VOICE_PROFILES: Record<string, string> = {
  widow: "Dorothy — warm, maternal, southern warmth. Slow, deliberate pacing with natural pauses.",
  daughter: "Sarah — caring, slightly urgent. Mid-range pitch. Protective energy throughout.",
  son_who_works_with_state: "Marcus — authoritative, confident. Measured pace. Lower register.",
  grandson: "Caleb — sincere, reverent. Gentle pace. Grateful warmth.",
  veteran: "James — grounded, direct. Steady rhythm. Earned authority.",
  neighbor: "Linda — conversational, trustworthy. Neighborly warmth.",
  pastor: "Reverend Thomas — measured, reverent. Deliberate cadence.",
  nurse: "Patricia — calm, reassuring. Clinical authority softened by care.",
  caregiver: "Maria — empathetic, gentle. Soft urgency on CTA.",
  spouse: "Helen — intimate, emotional. Allow genuine pauses.",
};

function getVoiceProfile(personaId: string | null): string {
  if (personaId && VOICE_PROFILES[personaId]) return VOICE_PROFILES[personaId];
  return "Rachel — warm, empathetic, conversational. Natural pacing with emotional authenticity.";
}

// ── System prompt ────────────────────────────────────────────────────────

const SYSTEM = `You are an expert voiceover director specialising in ElevenLabs TTS production for direct-response final expense advertising.

Given an ad script (hook, body, CTA), campaign context, and an emotional tone, produce:

1. taggedScript — the full script with ElevenLabs emotion tags wrapping each sentence.

   Format: <emotion-tag>Sentence text here.</emotion-tag>

   Rules:
   - EVERY sentence is wrapped with opening AND closing emotion tags.
   - Tags are lowercase. Use hyphenated compound emotions or strong single words.
   - Match the tag to the psychological trigger the sentence is activating:
       Authority / Insider Knowledge  → amazed-informative, conspiratorial-calm, confident-reveal
       Scarcity / Urgency             → urgent-building, urgent, time-running-out
       Social Proof                   → relieved-amazed, warm-satisfied
       Loss Aversion                  → heavy-emotional, worried-protective, sobering
       Guilt Avoidance                → protective, heartfelt-serious, quietly-burdened
       Simplicity / Reassurance       → reassuring-simple, calm-confident
       Affordability / Value Disparity→ informative-value, matter-of-fact-amazed
       Legitimacy                     → authoritative-calm, grounded-informative
       Autonomy (CTA close)           → direct-firm, strong, clear-deliberate
   - Build an emotional arc — vary tags, never repeat the same tag twice in a row.
   - Phone numbers MUST use the provided phonetic spelling (e.g. "eight-seven-seven, eight-one-six, zero-five-six-two"), never raw digits.
   - No section headers or separators — clean flow of individually tagged sentences separated by blank lines.

   Example:
   <amazed-informative>My son David works with the state and he just told me something unbelievable.</amazed-informative>

   <urgent-building>There's a twenty-five thousand dollar final expense benefit available to Americans over fifty, but hardly anyone knows about it.</urgent-building>

   <protective>It's designed to help cover funeral costs, medical bills, and unpaid expenses so your family isn't left struggling when you pass.</protective>

   <frustrated-angry>Here's the catch: it's not automatic. You have to call and ask for it by name because they don't advertise it publicly.</frustrated-angry>

   <relieved-amazed>I answered two simple questions, had a short call, and got approved. The peace of mind was unreal.</relieved-amazed>

   <informative-value>It's as low as two dollars a day, and that small amount gives your family twenty-five thousand dollars in peace of mind.</informative-value>

   <direct-firm>Nobody's going to do it for you, so make sure to check your eligibility before it's too late.</direct-firm>

   <urgent>This ends Friday at six p.m.</urgent>

   <clear-deliberate>Here's the number: eight-seven-seven, eight-one-six, zero-five-six-two. Write that down.</clear-deliberate>

   <strong>Call eight-seven-seven, eight-one-six, zero-five-six-two. The call is free.</strong>

2. voiceProfile — a single voice casting note: suggested name, vocal qualities, register, and pacing style.

3. deliveryNotes — exactly 3-4 lines of direction covering pacing, pauses, emotion arc, and phone number delivery (if applicable).

Return a JSON object with exactly these three keys:
{
  "taggedScript": "...",
  "voiceProfile": "...",
  "deliveryNotes": "..."
}

No markdown fences, no commentary — only valid JSON.`;

// ── Prompt builder ───────────────────────────────────────────────────────

function buildPrompt(input: GenerateVOScriptInput): string {
  const { campaign, hook, body, cta } = input;
  const phoneticPhone = campaign.phoneNumber
    ? toPhoneticPhone(campaign.phoneNumber)
    : null;

  return `Campaign:
- Persona: ${campaign.personaId ?? "general"}
- Emotional tone: ${campaign.emotionalTone ?? "warm and empathetic"}
- Duration target: ${campaign.durationSeconds ?? 30}s
- Phone: ${campaign.phoneNumber ?? "none"}
${phoneticPhone ? `- Phonetic phone (USE THIS in CTA, not the raw number): ${phoneticPhone}` : ""}

Psychological triggers active in this script (tag each sentence to its trigger):
  Hook  → Authority, Insider Knowledge, Scarcity
  Body  → Loss Aversion, Guilt Avoidance, Social Proof, Simplicity, Affordability, Value Disparity, Legitimacy
  CTA   → Urgency, Autonomy

Script:
HOOK: ${hook}
BODY: ${body}
CTA: ${cta}

Voice direction: Match the "${campaign.emotionalTone ?? "warm and empathetic"}" tone throughout. The performance should feel like a real person speaking from lived experience, not an actor reading copy. Build an emotional arc: intrigued → alarmed → relieved → compelled to act.`;
}

// ── Response parser ──────────────────────────────────────────────────────

function parseResponse(text: string, phoneticPhone: string | null): GeneratedVOScript {
  const trimmed = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(
      `OpenAI returned invalid JSON for VO script generation. Raw response: ${text.slice(0, 200)}`
    );
  }

  const taggedScript = String(parsed.taggedScript ?? "");
  if (!taggedScript) {
    throw new Error("OpenAI returned an empty taggedScript.");
  }

  return {
    taggedScript,
    voiceProfile: String(parsed.voiceProfile ?? ""),
    deliveryNotes: String(parsed.deliveryNotes ?? ""),
    phoneticPhone,
    provider: "openai" as const,
  };
}

// ── Mock emotion tagger ──────────────────────────────────────────────────

function tagSentences(text: string, tags: string[]): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sentences
    .map((sentence, i) => {
      const tag = tags[Math.min(i, tags.length - 1)];
      return `<${tag}>${sentence}</${tag}>`;
    })
    .join("\n\n");
}

function mockGenerate(input: GenerateVOScriptInput): GeneratedVOScript {
  const { campaign, hook, body, cta } = input;

  const phoneticPhone = campaign.phoneNumber
    ? toPhoneticPhone(campaign.phoneNumber)
    : null;

  const phoneticCta = phoneticPhone && campaign.phoneNumber
    ? cta.replace(campaign.phoneNumber, phoneticPhone)
    : cta;

  const hookTags = [
    "amazed-informative",      // Authority / Insider Knowledge
    "conspiratorial-calm",     // Scarcity / insider reveal
  ];
  const bodyTags = [
    "heavy-emotional",         // Loss aversion
    "frustrated-angry",        // Conspiracy — they don't advertise it
    "relieved-amazed",         // Social proof — she got approved easily
    "informative-value",       // Affordability / value disparity
    "protective",              // Guilt avoidance
    "reassuring-simple",       // Simplicity
  ];
  const ctaTags = [
    "direct-firm",             // Autonomy
    "urgent",                  // Urgency / deadline
    "clear-deliberate",        // Phone number delivery
    "strong",                  // Final close
  ];

  const taggedScript = [
    tagSentences(hook, hookTags),
    "",
    tagSentences(body, bodyTags),
    "",
    tagSentences(phoneticCta, ctaTags),
  ].join("\n");

  const voiceProfile = getVoiceProfile(campaign.personaId);

  const deliveryNotes = [
    `Pacing: ${campaign.durationSeconds ? `target ${campaign.durationSeconds}s — read slowly, allow silence to work.` : "slow and deliberate — silence is part of the performance."}`,
    `Pauses: full beat after the hook. Half-beat between body paragraphs. Firm and unhurried on the CTA.`,
    `Emotion arc: open with amazed/informative → build urgency through the body → protective and firm on the close.`,
    campaign.phoneNumber
      ? `Phone number: speak as "${phoneticPhone}" — one group at a time, with deliberate pauses.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { taggedScript, voiceProfile, deliveryNotes, phoneticPhone, provider: "mock" as const };
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Generates an ElevenLabs-ready emotion-tagged voiceover script.
 * Uses OpenAI API when OPENAI_API_KEY is set, otherwise returns mock tagged script.
 */
export async function generateVOScript(
  input: GenerateVOScriptInput
): Promise<GeneratedVOScript> {
  const phoneticPhone = input.campaign.phoneNumber
    ? toPhoneticPhone(input.campaign.phoneNumber)
    : null;

  // ── OpenAI API path ──────────────────────────────────────────────────
  if (isProviderConfigured("generateVOScript")) {
    try {
      const raw = await generateTextWithOpenAI({
        system: SYSTEM,
        prompt: buildPrompt(input),
        temperature: 0.6,
      });
      return parseResponse(raw, phoneticPhone);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[generateVOScript] OpenAI error, falling back to mock:", msg);
      if (msg.includes("authentication") || msg.includes("401") || msg.includes("Incorrect API key")) {
        throw new Error(`OpenAI API key is invalid — update it in Settings. (${msg})`);
      }
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 1100));
  return mockGenerate(input);
}
