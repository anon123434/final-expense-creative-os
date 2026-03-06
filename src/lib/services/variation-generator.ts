/**
 * Creative variation generator.
 *
 * ── Provider: Claude API ─────────────────────────────────────────────────
 *
 * Generates 10 creative variations from the current campaign, preserving
 * the psychological core (persona, archetype, trigger stack, offer) while
 * varying hooks, emotional angles, scene concepts, and prompts.
 *
 * Falls back to template-based mock when ANTHROPIC_API_KEY is not set.
 */

import type { Campaign, CampaignTrigger, AdConcept } from "@/types";
import type { CreativeVariation } from "@/types/variation";
import { buildImagePrompt, buildKlingPrompt } from "./prompt-style-guide";
import { isProviderConfigured, getProvider } from "@/lib/llm";

export interface GenerateVariationsInput {
  campaign: Campaign;
  triggers: CampaignTrigger[];
  selectedConcept: AdConcept | null;
}

interface VariationTemplate {
  title: string;
  hookStyle: string;
  emotionalTone: string;
  anglePrefix: string;
  whatChanged: string[];
  scenePattern: string[];
  /** Scene description for the hero image — subject, setting, light source. Style rules applied by buildImagePrompt. */
  imageDesc: string;
  /** Motion description for Kling — what moves and how. Style rules applied by buildKlingPrompt. */
  klingDesc: string;
}

const TEMPLATES: VariationTemplate[] = [
  {
    title: "The Widow's Regret",
    hookStyle: "widow-testimonial",
    emotionalTone: "grief and regret",
    anglePrefix: "A widow shares how one missed decision changed everything for her family",
    whatChanged: ["Hook reframed as widow testimonial", "Emotional anchor shifted to survivor regret", "Scene opens on empty chair at dinner table"],
    scenePattern: ["Widow at kitchen table, looking at old photos", "Empty chair at family dinner", "Children opening bills alone", "Agent at door with check — relief on faces"],
    imageDesc: "Elderly woman at kitchen table, hands holding a wedding photo, soft natural window light behind her, shallow depth of field",
    klingDesc: "Very slow push-in toward the woman's face. She pauses to look at the photo. A quiet, still moment.",
  },
  {
    title: "A Daughter's Perspective",
    hookStyle: "daughter-pov",
    emotionalTone: "love and responsibility",
    anglePrefix: "What a daughter wishes her parent had done before it was too late",
    whatChanged: ["Hook reframed from adult child's POV", "Guilt angle replaced with love angle", "Scene opens on daughter sorting paperwork"],
    scenePattern: ["Daughter on phone, worried expression", "Parent laughing with grandchildren — alive, present", "Daughter reading policy documents at desk", "Family hugging — burden lifted"],
    imageDesc: "Middle-aged woman at a modest home desk, warm evening lamp light, looking at paperwork with a concerned but loving expression",
    klingDesc: "Slow pan across framed family photos on the wall, settling on the woman at her desk. Unhurried and observational.",
  },
  {
    title: "The What-If Scenario",
    hookStyle: "what-if-framing",
    emotionalTone: "anxiety to relief",
    anglePrefix: "What if your family had to figure it out alone — starting tomorrow?",
    whatChanged: ["Hook uses hypothetical framing", "Tension built through imagined worst-case", "Scene opens on phone ringing at 3am"],
    scenePattern: ["Dark bedroom, phone ringing — shock on face", "Spouse alone at kitchen table with bills", "Funeral home with no plan", "Same scene — but with coverage, calm and dignified"],
    imageDesc: "Person sitting up in a dark bedroom, face caught in the glow of a bedside lamp, expression of shock and worry",
    klingDesc: "Very slow push-in toward the person's face. Expression shifts from startled to worried. Bedside lamp the only light source.",
  },
  {
    title: "The Authority Insider",
    hookStyle: "authority-insider",
    emotionalTone: "trust and expertise",
    anglePrefix: "A former insurance agent reveals what most families never get told",
    whatChanged: ["Hook positions speaker as insider authority", "Trust built through 'forbidden knowledge' framing", "Scene opens on agent at whiteboard"],
    scenePattern: ["Agent at whiteboard explaining policy gaps", "Shocked couple realizing what they missed", "Simple signup process — just minutes", "Family at peace — coverage confirmed"],
    imageDesc: "Person in business casual seated across a modest kitchen table, leaning forward slightly, explaining something with a calm authoritative expression",
    klingDesc: "Slow pull back from a medium close-up to reveal the couple listening at the table. Subtle focus shift from speaker to couple.",
  },
  {
    title: "The Scarcity Window",
    hookStyle: "scarcity-deadline",
    emotionalTone: "urgency and opportunity",
    anglePrefix: "This benefit amount is only available until the deadline — here's why it matters now",
    whatChanged: ["Hook leads with time-sensitive framing", "Deadline anchor made concrete and visual", "Scene opens on calendar with date circled"],
    scenePattern: ["Calendar on wall, specific date circled in red", "Phone call — rates just went up notification", "Family reviewing coverage before deadline", "Confirmation screen — locked in at low rate"],
    imageDesc: "Kitchen wall calendar with a date circled in red marker, warm natural window light casting soft shadows",
    klingDesc: "Very slow zoom in on the circled calendar date. Light shifts subtly as clouds pass outside the window.",
  },
  {
    title: "The Social Proof Wave",
    hookStyle: "social-proof",
    emotionalTone: "belonging and validation",
    anglePrefix: "Thousands of families just like yours have already made this decision",
    whatChanged: ["Hook leads with social proof signal", "Peer identification replaces fear appeal", "Scene opens on montage of diverse families"],
    scenePattern: ["Diverse families at home — safe and secure", "Neighbor recommending the plan over fence", "Phone call: 'I just signed up — you should too'", "Community feeling — all protected together"],
    imageDesc: "Two neighbors in easy conversation over a backyard fence, late afternoon sun, relaxed and genuine expressions",
    klingDesc: "Slow pan across a quiet residential neighborhood at golden hour, settling on two people in casual conversation.",
  },
  {
    title: "The Affordability Anchor",
    hookStyle: "affordability-shock",
    emotionalTone: "surprise and relief",
    anglePrefix: "Most people think this costs hundreds — it's actually less than a coffee a day",
    whatChanged: ["Hook opens with price expectation subversion", "Affordability made visceral with daily comparison", "Scene opens on coffee cup with price tag"],
    scenePattern: ["Coffee cup with '$5' price tag vs policy cost", "Couple surprised by low monthly amount", "Simple enrollment on phone — done in minutes", "Family protected — for less than expected"],
    imageDesc: "Couple at a modest kitchen table, one holding a phone showing a low monthly cost, both with surprised and relieved expressions",
    klingDesc: "Slow push-in from a wider shot of the couple to a close-up of the phone screen showing the monthly rate.",
  },
  {
    title: "The Legacy Promise",
    hookStyle: "legacy-promise",
    emotionalTone: "pride and legacy",
    anglePrefix: "The last gift you'll ever give your family is the one that matters most",
    whatChanged: ["Hook reframed as legacy and pride", "Emotional anchor shifted from fear to purpose", "Scene opens on grandparent with grandchild"],
    scenePattern: ["Grandparent reading to grandchild — present and loving", "Old photo album — generations of family", "Signing coverage paperwork — proud expression", "Letter from grandparent to future grandchildren"],
    imageDesc: "Grandparent in a lived-in living room armchair, grandchild on lap, warm afternoon window light, genuinely tender and unposed moment",
    klingDesc: "Very slow push-in toward the grandparent and grandchild. The grandparent gently turns a page. Still and emotionally resonant.",
  },
  {
    title: "The Conspiracy Insider",
    hookStyle: "insider-reveal",
    emotionalTone: "righteous anger and empowerment",
    anglePrefix: "Big insurance doesn't want you to know this plan exists — but it does",
    whatChanged: ["Hook uses 'they don't want you to know' framing", "Empowerment angle vs victimhood", "Scene opens on redacted document style"],
    scenePattern: ["Documents on table — 'what they hide from you'", "Couple discovering the plan for first time", "Side-by-side: big insurance cost vs this cost", "Family empowered — they found the secret"],
    imageDesc: "Papers and documents spread across a worn kitchen table, person leaning over them with focused expression, natural side window light",
    klingDesc: "Slow pan across documents on the kitchen table, camera settling on the person reading intently. Natural side window light.",
  },
  {
    title: "The Final Hour",
    hookStyle: "urgency-clock",
    emotionalTone: "urgency and clarity",
    anglePrefix: "Every day you wait, the cost goes up — and the window gets smaller",
    whatChanged: ["Hook opens with ticking clock metaphor", "Urgency built through compounding cost framing", "Scene opens on aging face in mirror"],
    scenePattern: ["Person looking in mirror — time passing", "Rate chart showing costs rising with age", "Couple making the call — decisive moment", "Peace of mind — decision made, family protected"],
    imageDesc: "Person standing at a bathroom mirror in morning light, natural window light, thoughtful and quietly concerned expression",
    klingDesc: "Slow push-in toward the person's reflection in the mirror. Steady and unhurried. The subject still, contemplating.",
  },
];

// ── System prompt ────────────────────────────────────────────────────────

const VARIATION_SYSTEM = `You are an elite direct-response advertising creative director. Given a campaign brief and optionally a base concept, generate 10 creative VARIATIONS — each with a distinct hook strategy, emotional angle, and visual approach.

For each variation return a JSON object with:
  title            — short working title (3-5 words)
  hookStyle        — tag for the hook strategy (e.g. "widow-testimonial")
  emotionalTone    — 2-3 word emotional descriptor
  anglePrefix      — one-sentence pitch for this variation's angle
  whatChanged       — array of 3 bullet points explaining what's different
  scenePattern     — array of 4 short scene descriptions
  imageDesc        — one sentence describing the hero image (subject, setting, light)
  klingDesc        — one sentence describing the hero motion clip (what moves, camera action)

Return a JSON array of 10 variation objects. No markdown fences, no commentary — only valid JSON.`;

function buildVariationPrompt(input: GenerateVariationsInput): string {
  const { campaign, triggers, selectedConcept } = input;
  const activeTriggers = triggers.filter((t) => t.included).map((t) => t.triggerKey);

  return `Campaign:
- Persona: ${campaign.personaId ?? "general"}
- Archetype: ${campaign.archetypeId ?? "general"}
- Emotional tone: ${campaign.emotionalTone ?? "empathetic"}
- Offer: ${campaign.offerName ?? "Final Expense Coverage"}
- Benefit: ${campaign.benefitAmount ?? "$15,000"}
- Phone: ${campaign.phoneNumber ?? "1-800-555-0100"}
- Deadline: ${campaign.deadlineText ?? "this month"}
- Active triggers: ${activeTriggers.join(", ") || "none"}
${selectedConcept ? `\nBase concept: "${selectedConcept.title}" — ${selectedConcept.oneSentenceAngle ?? ""}\nHook: ${selectedConcept.hook ?? ""}\n` : ""}
Generate 10 variations with diverse hook strategies (testimonial, what-if, authority, scarcity, social proof, affordability, legacy, insider, urgency, etc.).`;
}

function parseVariationResponse(
  text: string,
  input: GenerateVariationsInput
): CreativeVariation[] {
  const trimmed = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");
  const parsed = JSON.parse(trimmed);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const triggerStack = buildTriggerStack(input.triggers);

  return arr.map((v: Record<string, unknown>, i: number) => ({
    id: `variation-${Date.now()}-${i}`,
    campaignId: input.campaign.id,
    variationNumber: i + 1,
    title: String(v.title ?? `Variation ${i + 1}`),
    hook: String(v.anglePrefix ?? ""),
    oneSentenceAngle: String(v.anglePrefix ?? ""),
    emotionalTone: String(v.emotionalTone ?? ""),
    whatChanged: Array.isArray(v.whatChanged) ? v.whatChanged.map(String) : [],
    triggerStack,
    sceneSummary: Array.isArray(v.scenePattern) ? v.scenePattern.map(String) : [],
    imagePromptExamples: [
      buildImagePrompt(String(v.imageDesc ?? "")),
    ],
    klingPromptExamples: [
      buildKlingPrompt(String(v.klingDesc ?? "")),
    ],
    createdAt: new Date().toISOString(),
  }));
}

// ── Helpers ──────────────────────────────────────────────────────────────

function buildTriggerStack(triggers: CampaignTrigger[]): Record<string, boolean> {
  return Object.fromEntries(triggers.map((t) => [t.triggerKey, t.included]));
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Generates 10 creative variations for a campaign.
 * Uses Claude API when ANTHROPIC_API_KEY is set, otherwise returns template-based mock data.
 */
export async function generateCreativeVariations(
  input: GenerateVariationsInput
): Promise<CreativeVariation[]> {
  // ── Claude API path ──────────────────────────────────────────────────
  if (isProviderConfigured("generateCreativeVariations")) {
    try {
      const provider = getProvider("generateCreativeVariations");
      const result = await provider.generate({
        system: VARIATION_SYSTEM,
        prompt: buildVariationPrompt(input),
        maxTokens: 8192,
        temperature: 0.85,
      });
      return parseVariationResponse(result.text, input);
    } catch (err) {
      console.error("[generateCreativeVariations] Claude provider error, falling back to mock:", err);
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 1200));

  const { campaign, triggers, selectedConcept } = input;
  const triggerStack = buildTriggerStack(triggers);
  const offerName = campaign.offerName ?? "Final Expense Coverage";
  const benefit = campaign.benefitAmount ?? "$15,000";
  const phone = campaign.phoneNumber ?? "1-800-555-0100";
  const deadline = campaign.deadlineText ?? "this month";

  return TEMPLATES.map((template, i) => ({
    id: `variation-${Date.now()}-${i}`,
    campaignId: campaign.id,
    variationNumber: i + 1,
    title: template.title,
    hook: `${template.anglePrefix}. ${offerName} — up to ${benefit} in coverage. Call ${phone} before ${deadline}.`,
    oneSentenceAngle: selectedConcept
      ? `${template.anglePrefix} — building on the "${selectedConcept.title}" concept.`
      : `${template.anglePrefix}.`,
    emotionalTone: template.emotionalTone,
    whatChanged: template.whatChanged,
    triggerStack,
    sceneSummary: template.scenePattern,
    imagePromptExamples: [
      buildImagePrompt(template.imageDesc),
      buildImagePrompt(`${template.scenePattern[1] ?? template.scenePattern[0]}`),
    ],
    klingPromptExamples: [
      buildKlingPrompt(template.klingDesc),
    ],
    createdAt: new Date().toISOString(),
  }));
}
