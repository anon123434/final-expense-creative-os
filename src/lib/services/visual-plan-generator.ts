/**
 * Visual plan generation service.
 *
 * ── Provider: OpenAI API ─────────────────────────────────────────────────
 *
 * Takes a finalized script + campaign context and returns a full scene plan:
 * overall direction, base layer, A-roll ideas, B-roll ideas, and a scene-by-scene
 * breakdown with image prompts (Seedream / NanoBanana) and Kling video prompts.
 *
 * Falls back to template-based mock when OPENAI_API_KEY is not set.
 *
 * Prompt style rules are applied via prompt-style-guide.ts builders.
 */

import type { Campaign } from "@/types";
import type { SceneCard } from "@/types/scene";
import { buildImagePrompt, buildKlingPrompt, PHONE_LISTENING_BEAT, isPhoneListeningScene, CHECK_HOLDING_BEAT, isCheckHoldingScene, APPROVAL_LETTER_BEAT, isApprovalLetterScene } from "./prompt-style-guide";
import { generateTextWithOpenAI, isProviderConfigured } from "@/lib/llm";

// ── Service types ──────────────────────────────────────────────────────────

export interface GenerateVisualPlanInput {
  campaign: Campaign;
  hook: string;
  body: string;
  cta: string;
  /** Character description from the attached avatar (prompt or expandedPrompt). */
  avatarDescription?: string | null;
}

export interface GeneratedVisualPlan {
  overallDirection: string;
  baseLayer: string;
  aRollIdeas: string[];
  bRollIdeas: string[];
  scenes: SceneCard[];
}

export interface GenerateMoreBRollInput {
  campaign: Campaign;
  hook: string;
  body: string;
  cta: string;
  avatarDescription?: string | null;
  existingBRollIdeas: string[];
  startSceneNumber: number;
}

export interface GeneratedMoreBRoll {
  newIdeas: string[];
  newScenes: SceneCard[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function truncate(text: string, maxWords = 12): string {
  const words = text.split(/\s+/);
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(" ") + "…";
}

// ── Scene templates ────────────────────────────────────────────────────────
// Each template maps a script segment + index to a realistic scene plan.

interface SceneTemplate {
  sceneType: "A-roll" | "B-roll";
  setting: string;
  shotIdea: string;
  emotion: string;
  cameraStyle: string;
  imageSuffix: string;
  klingSuffix: string;
}

const HOOK_TEMPLATES: SceneTemplate[] = [
  {
    sceneType: "B-roll",
    setting: "modest living room, warm evening",
    shotIdea: "elderly woman sitting alone in armchair, looking at family photo",
    emotion: "quiet grief, wistful memory",
    cameraStyle: "50mm documentary realism, slight push-in",
    imageSuffix:
      "elderly woman in armchair holding family photograph, warm tungsten lamp behind her, dust particles in air, shallow depth of field",
    klingSuffix:
      "Her gaze drifts slowly from the photograph to the empty chair beside her. A quiet melancholic sigh. Very slow push-in.",
  },
  {
    sceneType: "B-roll",
    setting: "kitchen table, morning light",
    shotIdea: "hands wrapped around a coffee mug, staring into the distance",
    emotion: "contemplative worry",
    cameraStyle: "50mm close-up, shallow depth of field",
    imageSuffix:
      "close-up of older hands wrapped around ceramic coffee mug, soft morning window light, shallow depth of field",
    klingSuffix:
      "Hands slowly rotate the coffee mug. Steam rises and curls gently. The person stares into middle distance. No camera movement.",
  },
];

const BODY_TEMPLATES: SceneTemplate[] = [
  {
    sceneType: "B-roll",
    setting: "family kitchen, warm afternoon",
    shotIdea: "stack of unopened envelopes and bills on kitchen table",
    emotion: "financial dread, overwhelm",
    cameraStyle: "50mm medium shot, slow rack focus to bills",
    imageSuffix:
      "stack of unopened bills and envelopes on a worn kitchen table, afternoon window light, slightly desaturated",
    klingSuffix:
      "Camera slowly rack-focuses from a blurred family photo on the wall to the stack of bills in the foreground.",
  },
  {
    sceneType: "B-roll",
    setting: "funeral home exterior, overcast day",
    shotIdea: "family members walking into funeral home, solemn expressions",
    emotion: "grief, heaviness",
    cameraStyle: "50mm observational, slight telephoto compression",
    imageSuffix:
      "family in dark clothing walking into a small funeral home, overcast natural light, muted color palette",
    klingSuffix:
      "The family walks slowly toward the entrance. One person pauses at the door, visibly composing themselves.",
  },
  {
    sceneType: "A-roll",
    setting: "comfortable lived-in living room, midday",
    shotIdea: "spokesperson speaking directly to camera, warm and earnest",
    emotion: "sincerity, empathy, authority",
    cameraStyle: "50mm medium close-up, eye-level",
    imageSuffix:
      "friendly spokesperson seated in a comfortable lived-in living room, eye-level framing, warm practical lamp light, natural direct eye contact",
    klingSuffix:
      "The spokesperson speaks earnestly and directly to camera. Subtle natural breathing movement. Occasional small hand gesture. No camera movement.",
  },
  {
    sceneType: "B-roll",
    setting: "backyard, golden hour",
    shotIdea: "grandparent playing with grandchildren on grass",
    emotion: "joy, love, protection",
    cameraStyle: "50mm candid, golden hour backlight",
    imageSuffix:
      "grandparent on backyard grass playing with young grandchildren, golden hour backlight, candid and unposed",
    klingSuffix:
      "The grandparent gently tosses a ball to a grandchild. A small natural laugh. Golden hour backlight. No sudden movement.",
  },
  {
    sceneType: "B-roll",
    setting: "kitchen, morning",
    shotIdea: "avatar on phone, listening to agent explain coverage — relief washing over their face",
    emotion: "relief, hope, resolution",
    cameraStyle: "50mm medium shot, slow push-in on face",
    imageSuffix: `Medium close-up of person holding a phone to their ear, listening attentively. ${PHONE_LISTENING_BEAT.imageDirection}`,
    klingSuffix: PHONE_LISTENING_BEAT.klingMotion,
  },
  {
    sceneType: "B-roll",
    setting: "kitchen table, warm afternoon light",
    shotIdea: "avatar holds insurance benefit check, side profile, quiet disbelief and relief",
    emotion: "quiet disbelief transitioning to acceptance, relief",
    cameraStyle: "50mm medium shot, 3/4 angle, very slow push-in toward document",
    imageSuffix: `${CHECK_HOLDING_BEAT.imageDirection}`,
    klingSuffix: CHECK_HOLDING_BEAT.klingMotion,
  },
  {
    sceneType: "B-roll",
    setting: "living room, soft afternoon light",
    shotIdea: "avatar reads approval letter confirming coverage, shot from behind the shoulder — only partial side profile visible, focused and still",
    emotion: "focused reading transitioning to quiet acceptance",
    cameraStyle: "50mm medium shot, back shoulder view, very slow push-in toward document",
    imageSuffix: `${APPROVAL_LETTER_BEAT.imageDirection}`,
    klingSuffix: APPROVAL_LETTER_BEAT.klingMotion,
  },
];

const CTA_TEMPLATE: SceneTemplate = {
  sceneType: "A-roll",
  setting: "comfortable, modest living room",
  shotIdea: "spokesperson delivers call-to-action directly to camera",
  emotion: "urgency with warmth, actionable",
  cameraStyle: "50mm medium shot, static",
  imageSuffix:
    "spokesperson in a comfortable modest living room, warm and direct expression, natural eye contact with camera, phone number lower-third",
  klingSuffix:
    "The spokesperson delivers the call-to-action with calm sincerity. A deliberate nod. Static camera. Phone number graphic fades in lower-third.",
};

// ── System prompt ────────────────────────────────────────────────────────

const SYSTEM = `You are an expert visual director specialising in direct-response TV and social media ads for final expense insurance.

Given a script (hook, body, CTA) and campaign context, produce a complete visual plan.

Return a JSON object with these exact keys:

{
  "overallDirection": "2-3 sentence visual direction note covering tone, color palette, lighting approach, and pacing philosophy",
  "baseLayer": "1 sentence on footage sourcing strategy (stock + custom, text overlays, color grade)",
  "aRollIdeas": ["3-4 direct-to-camera or spokesperson ideas"],
  "bRollIdeas": ["4-6 emotional cutaway / insert ideas"],
  "scenes": [
    {
      "sceneNumber": 1,
      "lineReference": "first few words of the script line…",
      "sceneType": "A-roll" or "B-roll",
      "setting": "specific location, time of day, light source",
      "shotIdea": "what we see in this shot",
      "emotion": "emotional tone for this moment",
      "cameraStyle": "lens, framing, movement",
      "image_prompt": "rich visual description of the still image — subject, setting, framing, light quality. Tool-agnostic, no style rules.",
      "kling_prompt": "motion description — what physical movement occurs, camera action, pacing. Documentary realism, subtle movement only."
    }
  ]
}

IMPORTANT RULES:
- Create one scene per script sentence. Map every sentence to a scene.
- image_prompt: describe the subject, environment, framing, and lighting. DO NOT include "50mm", "documentary", "no watermarks", "16:9" — those are applied automatically by our pipeline.
- kling_prompt: describe what moves and how (a hand, a glance, a breath), plus camera action (slow push-in, static hold, slow pan). Prioritize documentary realism with subtle, grounded movement. DO NOT include "stabilized camera", "no shake", "50mm" — those are applied automatically.
- A-roll scenes should note direct eye contact with camera.
- B-roll scenes should feel observational and candid.
- Build an emotional arc across the scene sequence.
- No markdown fences, no commentary — only valid JSON.

PHONE LISTENING BEAT (apply automatically):
- Whenever a scene involves the avatar or spokesperson on a phone call where the other party is speaking, apply the following rules:
  1. sceneType MUST be "B-roll".
  2. The image_prompt MUST begin with the character (person holding the phone) as the primary subject — NOT the room, NOT objects in the room. Start with: "Medium close-up of [person description] holding a phone to their ear, listening attentively."
  3. Then append the full performance direction verbatim: "Expression: quiet focus, slight attentive lean, eyes soft and present. No speaking — mid-listen. Subtle suggestion of relief beginning to show. Phone held naturally to ear. Warm interior light."
  4. The kling_prompt MUST describe this full performance arc verbatim: "Avatar listens in silence as the other person speaks. Performance arc: attentive stillness → one or two small slow nods → tiny natural facial reactions showing understanding → quiet agreement. Near the end: expression softens noticeably — a subtle exhale, slight shoulder release, or small relaxing gesture signals relief. All movement minimal and involuntary-feeling. Very slow push-in on face."
- CRITICAL: The image_prompt must show the PERSON on the phone — never a coffee cup, kitchen counter, or empty room. The character's face and the phone are the subject.
- This beat applies to any scene where the subject receives good news, hears an agent explain coverage, or experiences any phone-based relief moment.

CHECK HOLDING BEAT (apply automatically):
- Whenever a scene involves the avatar holding a check (benefit payment, settlement, insurance payout), apply the following rules:
  1. sceneType MUST be "B-roll".
  2. (Pipeline note: useDocumentReference is set automatically by the server — you do not need to include this field in your JSON output.)
  3. The image_prompt MUST show the avatar in side profile, 3/4 angle, holding the document so it fills 40–50% of the frame. Start with: "Avatar holds a check with both hands, side profile, 3/4 angle. Document tilted slightly toward camera, filling 40–50% of frame."
  4. Append the full performance direction: "Expression: quiet disbelief transitioning to acceptance — slight parting of lips, soft eyes. Warm interior light. Medium shot."
  5. The kling_prompt MUST describe this arc: "Avatar looks down at the check. A slight pause — 1 to 2 seconds of absolute stillness. Then a slow exhale through the nose, tiny smile forming or chin lowering in quiet relief. One small slow nod of acceptance. No large gestures. Very slow push-in toward the document."
- CRITICAL: When documentReferenceUrl is set on this scene, the EXACT document image will be the first reference passed to the image generator. The generated image must treat it as a photographic reproduction, not invent a generic check.

APPROVAL LETTER BEAT (apply automatically):
- Whenever a scene involves the avatar reading an approval letter, acceptance document, or coverage confirmation, apply the following rules:
  1. sceneType MUST be "B-roll".
  2. (Pipeline note: useDocumentReference is set automatically by the server — you do not need to include this field in your JSON output.)
  3. The image_prompt MUST show the avatar from behind the shoulder — camera positioned behind and slightly to the side, only the avatar's partial side profile visible at the near frame edge. The letter must be a normal 8.5x11 sheet of paper, proportional to the person — NOT oversized. Start with: "Avatar holds a standard letter-sized piece of paper at natural reading distance, shot from behind the avatar's shoulder. Camera positioned behind and slightly to the side — only the avatar's partial side profile visible at the near frame edge. The paper is proportional to the person — normal 8.5x11 sheet, NOT oversized, occupying roughly 15–20% of the frame."
  4. Append the full performance direction: "Expression: focused and still — mid-read, eyes tracking across the page. Warm interior light. Medium shot."
  5. The kling_prompt MUST describe this arc: "Avatar reads the letter silently. Eyes track slowly across the page. A small still pause — expression held. Then expression softens — a quiet exhale or the shoulders drop very slightly. One slow nod of acceptance. No large gestures. Very slow push-in toward the document."
- CRITICAL: When documentReferenceUrl is set on this scene, the EXACT document image will be the first reference passed to the image generator. The generated image must treat it as a photographic reproduction, not invent a generic letter.

AVATAR LIKENESS RULES (when an avatar description is provided):
- Every A-roll image_prompt MUST begin with the exact avatar description verbatim, followed by the scene details.
- Every B-roll image_prompt that features a person who could be the spokesperson MUST also include the avatar description.
- Every B-roll scene that features family members, loved ones, friends, or other characters (grandchildren, spouses, adult children, etc.) MUST describe those characters as visually consistent with the avatar's family: same race and ethnicity, same skin tone, same general hair color and texture. Do NOT copy the avatar's exact face — they are family members who resemble the avatar, not clones. Use phrases like "same warm brown skin tone as the protagonist", "matching olive complexion", "same dark hair, clearly part of the same family".
- Maintain strict visual and ethnic consistency across all human subjects throughout the full scene sequence.`;

// ── Prompt builder ───────────────────────────────────────────────────────

function buildVisualPlanPrompt(input: GenerateVisualPlanInput): string {
  const { campaign, hook, body, cta, avatarDescription } = input;
  const avatarSection = avatarDescription
    ? `\nAvatar / Spokesperson likeness:\n${avatarDescription}\nUse verbatim in every A-roll image_prompt. Extract race, skin tone, and hair traits to maintain family visual consistency in B-roll scenes featuring family members or loved ones.\n`
    : "";
  return `Campaign:
- Persona: ${campaign.personaId ?? "general"}
- Emotional tone: ${campaign.emotionalTone ?? "warm and empathetic"}
- Duration target: ${campaign.durationSeconds ?? 30}s
- Phone: ${campaign.phoneNumber ?? "1-800-555-0100"}
${avatarSection}
Script:
HOOK: ${hook}
BODY: ${body}
CTA: ${cta}

Create a scene-by-scene visual plan now.`;
}

// ── Response parser ──────────────────────────────────────────────────────

interface RawSceneResponse {
  sceneNumber?: unknown;
  lineReference?: unknown;
  sceneType?: unknown;
  setting?: unknown;
  shotIdea?: unknown;
  emotion?: unknown;
  cameraStyle?: unknown;
  image_prompt?: unknown;
  kling_prompt?: unknown;
  // Legacy field names
  imageDesc?: unknown;
  klingDesc?: unknown;
}

function parseVisualPlanResponse(text: string): GeneratedVisualPlan {
  const trimmed = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(
      `OpenAI returned invalid JSON for visual plan generation. Raw response: ${text.slice(0, 200)}`
    );
  }

  const rawScenes = parsed.scenes;
  if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
    throw new Error("OpenAI returned no scenes in visual plan response.");
  }

  const scenes: SceneCard[] = (rawScenes as RawSceneResponse[]).map((s) => {
    const sceneType = String(s.sceneType ?? "B-roll") as "A-roll" | "B-roll";

    // Accept both new (image_prompt/kling_prompt) and legacy (imageDesc/klingDesc) field names
    const rawImage = String(s.image_prompt ?? s.imageDesc ?? "");
    const rawKling = String(s.kling_prompt ?? s.klingDesc ?? "");

    const combinedText = rawImage + " " + String(s.shotIdea ?? "");
    const isDocScene = isCheckHoldingScene(combinedText) || isApprovalLetterScene(combinedText);

    return {
      sceneNumber: Number(s.sceneNumber ?? 1),
      lineReference: String(s.lineReference ?? ""),
      sceneType,
      setting: String(s.setting ?? ""),
      shotIdea: String(s.shotIdea ?? ""),
      emotion: String(s.emotion ?? ""),
      cameraStyle: String(s.cameraStyle ?? ""),
      imagePrompt: buildImagePrompt(rawImage, sceneType === "A-roll"),
      klingPrompt: buildKlingPrompt(rawKling),
      useAvatarReference: sceneType === "A-roll" || isPhoneListeningScene(combinedText) || isDocScene,
      useDocumentReference: isDocScene,
    };
  });

  const nextNumber = scenes.length > 0 ? scenes[scenes.length - 1].sceneNumber + 1 : scenes.length + 1;
  const allScenes = [...scenes, ...buildDocumentScenes(nextNumber, "")];

  return {
    overallDirection: String(parsed.overallDirection ?? ""),
    baseLayer: String(parsed.baseLayer ?? ""),
    aRollIdeas: Array.isArray(parsed.aRollIdeas) ? parsed.aRollIdeas.map(String) : [],
    bRollIdeas: Array.isArray(parsed.bRollIdeas) ? parsed.bRollIdeas.map(String) : [],
    scenes: allScenes,
  };
}

// ── Family resemblance helper ─────────────────────────────────────────────
// Extracts race/skin/hair cues from an avatar description for B-roll family scenes.

function buildFamilyResemblanceNote(avatarDescription: string | null | undefined): string {
  if (!avatarDescription) return "";
  // Look for common race/skin/hair phrases to surface as a family note
  const lower = avatarDescription.toLowerCase();
  const cues: string[] = [];
  if (/dark\s*brown\s*skin|deep\s*brown\s*skin|ebony\s*skin|black\s*skin/i.test(avatarDescription)) cues.push("same deep brown skin tone");
  else if (/medium\s*brown\s*skin|warm\s*brown\s*skin|caramel\s*skin|tan\s*skin/i.test(avatarDescription)) cues.push("same warm brown skin tone");
  else if (/light\s*brown\s*skin|olive\s*skin|bronze\s*skin/i.test(avatarDescription)) cues.push("same olive complexion");
  else if (/fair\s*skin|pale\s*skin|light\s*skin/i.test(avatarDescription)) cues.push("same fair complexion");
  if (/black\s*hair/i.test(avatarDescription)) cues.push("same dark black hair");
  else if (/dark\s*brown\s*hair/i.test(avatarDescription)) cues.push("same dark brown hair");
  else if (/grey\s*hair|gray\s*hair|silver\s*hair|white\s*hair/i.test(avatarDescription)) cues.push("same grey hair");
  else if (/blonde\s*hair|blond\s*hair/i.test(avatarDescription)) cues.push("same blonde hair");
  if (/african\s*american|black\s*american/i.test(lower)) cues.push("African American family");
  else if (/hispanic|latina|latino|mexican|puerto\s*rican/i.test(lower)) cues.push("Hispanic family");
  else if (/asian|chinese|korean|japanese|vietnamese|filipino/i.test(lower)) cues.push("Asian family");
  else if (/south\s*asian|indian|pakistani|bengali/i.test(lower)) cues.push("South Asian family");
  else if (/middle\s*eastern|arab/i.test(lower)) cues.push("Middle Eastern family");
  if (cues.length === 0) return "";
  return `(family members share the protagonist's traits: ${cues.join(", ")})`;
}

// ── Mock implementation ────────────────────────────────────────────────────

function mockVisualPlan(input: GenerateVisualPlanInput): GeneratedVisualPlan {

  const { campaign, hook, body, cta, avatarDescription } = input;
  const avatarPrefix = avatarDescription ? `${avatarDescription}. ` : "";
  const familyNote = buildFamilyResemblanceNote(avatarDescription);

  const bodySentences = splitSentences(body);

  // ── Overall direction ──────────────────────────────────────────────────
  const overallDirection = [
    `Warm, emotionally grounded, kitchen-table realism.`,
    `50mm documentary look throughout — no stylized cinematography.`,
    `Lighting: warm tungsten and practical sources, golden hour for exterior B-roll.`,
    `Color palette: muted warmth, slightly desaturated problem scenes, richer tones on resolution and CTA.`,
    `Pacing: slow and deliberate — silence and stillness do emotional work.`,
    campaign.durationSeconds
      ? `Target runtime: ${campaign.durationSeconds} seconds. Every scene earns its frame.`
      : `Tight edit — only essential images. Every scene earns its frame.`,
  ].join(" ");

  // ── Base layer ─────────────────────────────────────────────────────────
  const baseLayer = `High-quality stock footage base (Storyblocks / Artgrid) with select custom A-roll. Minimal text overlays — phone number lower-third on CTA only. No motion graphics. Subtle cinematic color grade throughout.`;

  // ── A-roll ideas ───────────────────────────────────────────────────────
  const aRollIdeas = [
    `Spokesperson — warm, authoritative, direct-to-camera (medium close-up, 50mm, eye-level)`,
    `Couple seated at kitchen table reviewing documents together — candid, not posed`,
    `Phone call moment — expression of relief after speaking with agent`,
    campaign.phoneNumber
      ? `Final CTA frame with phone number ${campaign.phoneNumber} in clean lower-third`
      : `Final CTA frame with phone number in clean lower-third`,
  ];

  // ── B-roll ideas ───────────────────────────────────────────────────────
  const bRollIdeas = [
    `Elderly hands holding family photograph — tight 50mm close-up, tungsten light`,
    `Stack of bills on kitchen table — rack focus from family photo to bills`,
    `Grandparent with grandchildren — golden hour backyard, candid movement`,
    `Couple reviewing insurance paperwork with relief — warm kitchen light`,
    `Funeral home exterior — overcast, observational, muted palette`,
    `Empty chair in living room — symbolic, minimal, poetic`,
  ];

  // ── Scene breakdown ────────────────────────────────────────────────────
  const scenes: SceneCard[] = [];
  let sceneNumber = 1;

  // Hook scenes
  const hookTemplate = HOOK_TEMPLATES[sceneNumber % HOOK_TEMPLATES.length];
  scenes.push({
    sceneNumber: sceneNumber++,
    lineReference: truncate(hook),
    sceneType: hookTemplate.sceneType,
    setting: hookTemplate.setting,
    shotIdea: hookTemplate.shotIdea,
    emotion: hookTemplate.emotion,
    cameraStyle: hookTemplate.cameraStyle,
    imagePrompt: buildImagePrompt(
      hookTemplate.sceneType === "A-roll"
        ? `${avatarPrefix}${hookTemplate.setting}. ${hookTemplate.imageSuffix}`
        : familyNote
          ? `${hookTemplate.setting}. ${hookTemplate.imageSuffix} ${familyNote}`
          : `${hookTemplate.setting}. ${hookTemplate.imageSuffix}`,
      hookTemplate.sceneType === "A-roll"
    ),
    klingPrompt: buildKlingPrompt(hookTemplate.klingSuffix),
    useAvatarReference: hookTemplate.sceneType === "A-roll",
  });

  // Body scenes — one per sentence, cycling through body templates
  bodySentences.forEach((sentence, i) => {
    const tmpl = BODY_TEMPLATES[i % BODY_TEMPLATES.length];
    const tmplText = tmpl.shotIdea + " " + tmpl.imageSuffix;
    const isTmplDocScene = isCheckHoldingScene(tmplText) || isApprovalLetterScene(tmplText);
    scenes.push({
      sceneNumber: sceneNumber++,
      lineReference: truncate(sentence),
      sceneType: tmpl.sceneType,
      setting: tmpl.setting,
      shotIdea: tmpl.shotIdea,
      emotion: tmpl.emotion,
      cameraStyle: tmpl.cameraStyle,
      imagePrompt: buildImagePrompt(
        tmpl.sceneType === "A-roll"
          ? `${avatarPrefix}${tmpl.setting}. ${tmpl.imageSuffix}`
          : familyNote
            ? `${tmpl.setting}. ${tmpl.imageSuffix} ${familyNote}`
            : `${tmpl.setting}. ${tmpl.imageSuffix}`,
        tmpl.sceneType === "A-roll"
      ),
      klingPrompt: buildKlingPrompt(tmpl.klingSuffix),
      useAvatarReference: tmpl.sceneType === "A-roll" || isPhoneListeningScene(tmplText) || isTmplDocScene,
      useDocumentReference: isTmplDocScene,
    });
  });

  // CTA scene
  const phoneRef = campaign.phoneNumber ? ` Call ${campaign.phoneNumber}.` : "";
  scenes.push({
    sceneNumber: sceneNumber,
    lineReference: truncate(cta + phoneRef),
    sceneType: CTA_TEMPLATE.sceneType,
    setting: CTA_TEMPLATE.setting,
    shotIdea: CTA_TEMPLATE.shotIdea,
    emotion: CTA_TEMPLATE.emotion,
    cameraStyle: CTA_TEMPLATE.cameraStyle,
    imagePrompt: buildImagePrompt(
      `${avatarPrefix}${CTA_TEMPLATE.setting}. ${CTA_TEMPLATE.imageSuffix}`,
      true
    ),
    klingPrompt: buildKlingPrompt(CTA_TEMPLATE.klingSuffix),
    useAvatarReference: true,
  });

  // Always append check and approval letter scenes
  const docScenes = buildDocumentScenes(sceneNumber + 1, avatarPrefix);
  scenes.push(...docScenes);

  return {
    overallDirection,
    baseLayer,
    aRollIdeas,
    bRollIdeas,
    scenes,
  };
}

// ── Document scenes (always appended) ────────────────────────────────────
// The check and approval letter scenes are appended to every visual plan.
// useDocumentReference: true signals the scene card to show the upload UI.

function buildDocumentScenes(startNumber: number, avatarPrefix: string): SceneCard[] {
  return [
    {
      sceneNumber: startNumber,
      lineReference: "Receiving the benefit check",
      sceneType: "B-roll",
      setting: "kitchen table, warm afternoon light",
      shotIdea: "avatar holds insurance benefit check, side profile, quiet disbelief and relief",
      emotion: "quiet disbelief transitioning to acceptance, relief",
      cameraStyle: "50mm medium shot, 3/4 angle, very slow push-in toward document",
      imagePrompt: buildImagePrompt(
        `${avatarPrefix}${CHECK_HOLDING_BEAT.imageDirection}`,
        false
      ),
      klingPrompt: buildKlingPrompt(CHECK_HOLDING_BEAT.klingMotion),
      useAvatarReference: true,
      useDocumentReference: true,
    },
    {
      sceneNumber: startNumber + 1,
      lineReference: "Reading the approval letter",
      sceneType: "B-roll",
      setting: "living room, soft afternoon light",
      shotIdea: "avatar reads approval letter confirming coverage, shot from behind the shoulder — only partial side profile visible, focused and still",
      emotion: "focused reading transitioning to quiet acceptance",
      cameraStyle: "50mm medium shot, back shoulder view, very slow push-in toward document",
      imagePrompt: buildImagePrompt(
        `${avatarPrefix}${APPROVAL_LETTER_BEAT.imageDirection}`,
        false
      ),
      klingPrompt: buildKlingPrompt(APPROVAL_LETTER_BEAT.klingMotion),
      useAvatarReference: true,
      useDocumentReference: true,
    },
  ];
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Generates a visual plan (scene breakdown + prompts) for a script.
 * Uses OpenAI API when OPENAI_API_KEY is set, otherwise returns template-based mock.
 */
export async function generateVisualPlan(
  input: GenerateVisualPlanInput
): Promise<GeneratedVisualPlan> {
  // ── OpenAI API path ──────────────────────────────────────────────────
  if (isProviderConfigured("generateVisualPlan")) {
    try {
      const raw = await generateTextWithOpenAI({
        system: SYSTEM,
        prompt: buildVisualPlanPrompt(input),
        maxTokens: 8192,
        temperature: 0.6,
      });
      return parseVisualPlanResponse(raw);
    } catch (err) {
      console.error("[generateVisualPlan] OpenAI error, falling back to mock:", err);
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 1400));
  return mockVisualPlan(input);
}

export async function generateMoreBRoll(
  input: GenerateMoreBRollInput
): Promise<GeneratedMoreBRoll> {
  if (!isProviderConfigured("generateMoreBRoll")) {
    // Mock fallback: 3 hardcoded new ideas
    const mock = [
      "Adult child calling to check in on aging parent",
      "Family gathered around dinner table, one empty seat",
      "Hands signing a document at a kitchen table",
    ];
    return {
      newIdeas: mock,
      newScenes: mock.map((idea, i) => ({
        sceneNumber: input.startSceneNumber + i,
        lineReference: truncate(idea),
        sceneType: "B-roll" as const,
        setting: "modest home interior, natural light",
        shotIdea: idea,
        emotion: "quiet reflection",
        cameraStyle: "50mm documentary realism, static",
        imagePrompt: buildImagePrompt(idea, false),
        klingPrompt: buildKlingPrompt("Camera holds still. Subject moves with natural, unposed behavior. Very slow push-in."),
        useAvatarReference: false,
        useDocumentReference: false,
      })),
    };
  }

  const avoidList = input.existingBRollIdeas.length > 0
    ? `\n\nAlready covered — do NOT repeat these:\n${input.existingBRollIdeas.map((x, i) => `${i + 1}. ${x}`).join("\n")}`
    : "";

  const avatarSection = input.avatarDescription
    ? `\nAvatar likeness:\n${input.avatarDescription}\nApply family visual consistency rules to any B-roll featuring people.\n`
    : "";

  const systemPrompt = `You are a visual director for final expense insurance video ads.

Generate 3 new B-roll scene ideas for the given script. Each idea must be emotionally resonant, distinct from the existing ideas, and suitable for a 30-second final expense ad.

Return a JSON array (no wrapper object, no markdown fences):
[
  {
    "idea": "one-sentence concept description",
    "setting": "specific location, time of day, light source",
    "shotIdea": "what we see — subject and action",
    "emotion": "emotional tone",
    "cameraStyle": "lens, framing, movement style",
    "image_prompt": "rich visual description — subject, setting, framing, light. Do NOT include 50mm, documentary, no watermarks, 16:9.",
    "kling_prompt": "what moves and how, camera action. Do NOT include stabilized, no shake, 50mm."
  }
]

RULES:
- All scenes are B-roll (observational, candid, no direct camera address).
- image_prompt must describe the subject clearly — a person, object, or environment.
- kling_prompt must describe subtle, grounded movement only.
- Build emotional variety across the 3 new ideas.${input.avatarDescription ? "\n- Apply the same family visual consistency rules as the main plan." : ""}`;

  const userPrompt = `Campaign:
- Persona: ${input.campaign.personaId ?? "general"}
- Emotional tone: ${input.campaign.emotionalTone ?? "warm and empathetic"}
${avatarSection}
Script:
HOOK: ${input.hook}
BODY: ${input.body}
CTA: ${input.cta}
${avoidList}

Generate 3 new B-roll ideas now.`;

  try {
    const rawText = await generateTextWithOpenAI({ system: systemPrompt, prompt: userPrompt });
    const trimmed = rawText.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");

    let parsed: Array<Record<string, unknown>>;
    try {
      parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) throw new Error("Not an array");
    } catch {
      throw new Error(`OpenAI returned invalid JSON for generateMoreBRoll: ${rawText.slice(0, 200)}`);
    }

    const newIdeas: string[] = [];
    const newScenes: SceneCard[] = [];

    parsed.forEach((item, i) => {
      const idea = String(item.idea ?? item.shotIdea ?? "New B-roll idea");
      const imageDesc = String(item.image_prompt ?? "");
      const klingDesc = String(item.kling_prompt ?? "");
      newIdeas.push(idea);
      newScenes.push({
        sceneNumber: input.startSceneNumber + i,
        lineReference: truncate(idea),
        sceneType: "B-roll",
        setting: String(item.setting ?? ""),
        shotIdea: String(item.shotIdea ?? idea),
        emotion: String(item.emotion ?? ""),
        cameraStyle: String(item.cameraStyle ?? ""),
        imagePrompt: buildImagePrompt(imageDesc, false),
        klingPrompt: buildKlingPrompt(klingDesc),
        useAvatarReference: false,
        useDocumentReference: false,
      });
    });

    return { newIdeas, newScenes };
  } catch (err) {
    console.error("[generateMoreBRoll] OpenAI call failed:", err);
    throw err;
  }
}
