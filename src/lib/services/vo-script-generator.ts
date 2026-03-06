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

const SYSTEM = `You are an expert voiceover director specialising in ElevenLabs TTS production for direct-response advertising.

Given an ad script (hook, body, CTA), campaign context, and an emotional tone, produce:

1. taggedScript — the full script with ElevenLabs emotion tags on every sentence.
   Format:
   <emotion description>
   Sentence text here.

   Rules:
   - Each sentence gets its own emotion tag on the line above it.
   - Tags are lowercase, concise emotional/delivery directions inside angle brackets.
   - Vary tags across sentences — build an emotional arc, don't repeat the same tag.
   - Phone numbers MUST use the provided phonetic spelling, never raw digits.
   - Separate sections with headers: ── HOOK ──, ── BODY ──, ── CALL TO ACTION ──

   Example:
   ── HOOK ──
   <subtle warmth>
   Every Saturday night, we'd put that same old record on...

   <intimate, softer>
   He'd pull me close in this very living room...

   ── CALL TO ACTION ──
   <firm, practical>
   The number is eight-seven-seven... eight-zero-six... zero-six-seven-nine.

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

Script:
HOOK: ${hook}
BODY: ${body}
CTA: ${cta}

Voice direction: Match the "${campaign.emotionalTone ?? "warm and empathetic"}" tone throughout. The performance should feel like a real person speaking from experience, not an actor reading copy. Build an emotional arc from the hook through the CTA.`;
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
  };
}

// ── Mock emotion tagger ──────────────────────────────────────────────────

function tagSection(text: string, sectionTags: string[]): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sentences
    .map((sentence, i) => {
      const tag = sectionTags[Math.min(i, sectionTags.length - 1)];
      return `<${tag}>\n${sentence}`;
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
    "subtle warmth, speaking directly to the viewer",
    "gentle pause — let the question land",
  ];
  const bodyTags = [
    "intimate, confessional tone",
    "weight of reality — measured, somber",
    "shift: offering relief, warmer",
    "reassuring, matter-of-fact simplicity",
  ];
  const ctaTags = [
    "warm urgency — not pushy, but sincere",
    "firm, practical — every word deliberate",
  ];

  const taggedScript = [
    "── HOOK ─────────────────────────────────────────",
    tagSection(hook, hookTags),
    "",
    "── BODY ─────────────────────────────────────────",
    tagSection(body, bodyTags),
    "",
    "── CALL TO ACTION ───────────────────────────────",
    tagSection(phoneticCta, ctaTags),
  ].join("\n");

  const voiceProfile = getVoiceProfile(campaign.personaId);

  const deliveryNotes = [
    `Pacing: ${campaign.durationSeconds ? `target ${campaign.durationSeconds}s — read slowly, allow silence to work.` : "slow and deliberate — silence is part of the performance."}`,
    `Pauses: full beat after the hook question. Half-beat between body paragraphs. Firm, unhurried on the CTA.`,
    `Emotion arc: open with quiet intimacy → weight of the problem → warmth of the solution → grounded urgency on the call to action.`,
    campaign.phoneNumber
      ? `Phone number: speak as "${phoneticPhone}" — one group at a time, no rushing.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { taggedScript, voiceProfile, deliveryNotes, phoneticPhone };
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
      console.error("[generateVOScript] OpenAI error, falling back to mock:", err);
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 1100));
  return mockGenerate(input);
}
