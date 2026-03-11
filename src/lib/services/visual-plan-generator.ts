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
import type { CinematicHookStyle } from "@/types/cinematic-hook";
import { buildImagePrompt, buildKlingPrompt, PHONE_LISTENING_BEAT, isPhoneListeningScene, CHECK_HOLDING_BEAT, isCheckHoldingScene, APPROVAL_LETTER_BEAT, isApprovalLetterScene } from "./prompt-style-guide";
import { generateTextWithOpenAI, generateText as generateTextWithClaude, isProviderConfigured } from "@/lib/llm";
import { isClaudeConfigured } from "@/lib/llm/providers/claude";

// ── Service types ──────────────────────────────────────────────────────────

export interface GenerateVisualPlanInput {
  campaign: Campaign;
  hook: string;
  body: string;
  cta: string;
  /** Character description from the attached avatar (prompt or expandedPrompt). */
  avatarDescription?: string | null;
  /** Optional pre-built cinematic cold open to prepend as scenes 1-N. */
  cinematicHookStyle?: CinematicHookStyle;
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
    setting: "funeral home corridor, overcast daylight through tall windows",
    shotIdea: "widow walking calmly through a crowd of mourners — others whisper and glance at her, long lens compression",
    emotion: "composed dignity amid shocked disbelief from others",
    cameraStyle: "85mm telephoto, observational, crowd slightly soft-focus behind her",
    imageSuffix:
      "widow in dark clothing walking through a blurred crowd of mourners, long lens compression, others turning to look and whisper, muted natural light",
    klingSuffix:
      "[Spielberg] Slow push-in from behind as the widow walks forward. Mourners in the soft background turn to each other and whisper. She doesn't look back. Sound: low crowd murmur, distant organ note.",
  },
  {
    sceneType: "B-roll",
    setting: "kitchen table, morning light streaming through blinds",
    shotIdea: "close-up of hands slowly opening a large envelope — edge of a check visible inside",
    emotion: "disbelief transitioning to quiet shock",
    cameraStyle: "50mm extreme close-up, shallow depth of field on hands and envelope edge",
    imageSuffix:
      "close-up of weathered hands carefully opening a white envelope, edge of a check visible, warm morning window light, shallow depth of field",
    klingSuffix:
      "[Fincher] Static close-up. Hands slowly pull the envelope open. One finger slides across the paper edge. The check slides into view — camera holds. Sound: paper against paper, then silence.",
  },
];

const BODY_TEMPLATES: SceneTemplate[] = [
  {
    sceneType: "B-roll",
    setting: "funeral home director's office, late afternoon",
    shotIdea: "funeral director slides a bill across a dark desk — close-up on the total amount",
    emotion: "financial dread, shock",
    cameraStyle: "50mm close-up, slow rack focus from director's face to the bill total",
    imageSuffix:
      "close-up of a funeral home invoice being slid across a dark wooden desk, overhead lamp, total line visible, slightly desaturated",
    klingSuffix:
      "[Fincher] Cold static shot. The director's hand slides the paper forward. A finger taps the total. The subject's hand enters frame and picks it up slowly. Sound: paper on wood, clock ticking.",
  },
  {
    sceneType: "B-roll",
    setting: "funeral home exterior, overcast day",
    shotIdea: "family in dark clothing entering — one person stops at the door, visibly composing themselves",
    emotion: "grief, heaviness, dread",
    cameraStyle: "85mm telephoto compression, observational, long shot",
    imageSuffix:
      "family in dark clothing approaching a small funeral home entrance, overcast natural light, one figure pausing at the door with a hand on the frame",
    klingSuffix:
      "[Villeneuve] Long static wide. Family moves slowly toward the entrance in near-silence. One figure stops at the door — hand on the frame, a breath, then steps inside. Sound: distant traffic, a single muffled sob.",
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
      "[Spielberg] Static medium close-up. Spokesperson speaks directly to camera — small natural head movement, one deliberate hand gesture. Expression earnest and warm. Sound: room tone, natural breathing.",
  },
  {
    sceneType: "B-roll",
    setting: "kitchen table, natural window light",
    shotIdea: "stack of unopened bills and envelopes — rack focus from blurred family photo to sharp bills",
    emotion: "financial overwhelm, quiet dread",
    cameraStyle: "50mm medium shot, slow rack focus",
    imageSuffix:
      "stack of unopened bills and envelopes on a worn kitchen table, blurred family photo visible in background, afternoon window light, slightly desaturated",
    klingSuffix:
      "[Fincher] Camera holds still. Rack focus pulls from the family photograph on the wall to the stack of bills in the foreground — the sharpness of the bills hitting like a statement. Sound: paper rustling, near-silence.",
  },
  {
    sceneType: "B-roll",
    setting: "kitchen, morning",
    shotIdea: "avatar on phone, listening to agent explain coverage — relief washing over their face",
    emotion: "relief, hope, resolution",
    cameraStyle: "50mm medium shot, slow push-in on face",
    imageSuffix: `Medium close-up of person holding a phone to their ear, listening attentively. ${PHONE_LISTENING_BEAT.imageDirection}`,
    klingSuffix: `[Spielberg] ${PHONE_LISTENING_BEAT.klingMotion} Sound: faint voice from phone receiver, a slow exhale.`,
  },
  {
    sceneType: "B-roll",
    setting: "kitchen table, warm afternoon light",
    shotIdea: "avatar holds insurance benefit check, side profile, quiet disbelief and relief",
    emotion: "quiet disbelief transitioning to acceptance, relief",
    cameraStyle: "50mm medium shot, 3/4 angle, very slow push-in toward document",
    imageSuffix: `${CHECK_HOLDING_BEAT.imageDirection}`,
    klingSuffix: `[Spielberg] ${CHECK_HOLDING_BEAT.klingMotion} Sound: single quiet exhale against near-silence.`,
  },
  {
    sceneType: "B-roll",
    setting: "living room, soft afternoon light",
    shotIdea: "avatar reads approval letter confirming coverage, shot from behind the shoulder — only partial side profile visible, focused and still",
    emotion: "focused reading transitioning to quiet acceptance",
    cameraStyle: "50mm medium shot, back shoulder view, very slow push-in toward document",
    imageSuffix: `${APPROVAL_LETTER_BEAT.imageDirection}`,
    klingSuffix: `[Villeneuve] ${APPROVAL_LETTER_BEAT.klingMotion} Sound: paper shifting, then quiet.`,
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
  "bRollIdeas": ["4-6 SCROLL-STOPPING ideas — each must be a distinct, specific visual that makes someone stop mid-scroll. Required types: at least one DOCUMENT REVEAL (check, envelope opening, bill on a desk), one CROWD/SOCIAL TENSION shot (mourners whispering, heads turning), one FACE IN RAW MICRO-EMOTION (disbelief → relief, silent grief, quiet shock). FORBIDDEN: families at dinner tables, children playing, coffee mugs, hands on keyboards, generic 'elderly person' shots, sunlit backyards, walking in the park."],
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
      "kling_prompt": "cinematic motion description using this format: [Director style tag] + camera movement + subject movement + emotional micro-beat + sound note. Director tags: [Spielberg] = slow push-in on a face during revelation, hold on the reaction, silence does the work; [Fincher] = cold precise dolly, ordinary rendered ominous, controlled dread; [Scorsese] = motivated tracking shot following energy, dynamic but grounded; [Nolan] = dramatic hold then sudden reveal, scale contrast; [Villeneuve] = extreme wide to close, long silence, weight of empty space. Always end with a sound note, e.g. 'Sound: paper rustling against near-silence' or 'Sound: distant crowd murmur' or 'Sound: single slow breath'. For A-roll dialogue scenes, include the first spoken sentence."
    }
  ]
}

IMPORTANT RULES:
- Create one scene per script sentence. Map EVERY sentence to a scene.
- image_prompt: describe the subject, environment, framing, and lighting. DO NOT include "50mm", "documentary", "no watermarks", "16:9" — those are applied automatically by our pipeline.
- kling_prompt: Use the cinematic director-technique format from the schema. Choose the director tag that best matches the scene's emotional tone (revelation = Spielberg, dread = Fincher, energy = Scorsese, dramatic reveal = Nolan, quiet weight = Villeneuve). Always include a Sound note at the end. DO NOT include "stabilized camera", "no shake", "50mm" — those are applied automatically.
- A-roll scenes should note direct eye contact with camera.
- B-roll scenes must be SCROLL-STOPPING. Required: at least one document reveal (check/envelope/bill), one crowd/social tension moment (whispering mourners, heads turning), one raw face micro-emotion. HARD BANNED: families at dinner tables, children playing, coffee mugs, sunlit backyards, walking in parks, generic "elderly person" lifestyle shots. Every B-roll must make someone's thumb stop.
- Build an emotional arc across the scene sequence.
- No markdown fences, no commentary — only valid JSON.

HOOK VISUAL RULE (scene 1 — the most important scene):
- The first scene (hook) must ALMOST ALWAYS be B-roll, not A-roll. In direct-response ads, the hook is spoken over a striking visual — not a talking head. The visual must create the "stop scrolling" moment.
- Map the hook's emotional punch to a specific physical image:
  • Hook about receiving unexpected money → close-up hands opening an envelope, edge of a check visible
  • Hook about a funeral / death → widow or family at funeral home, 85mm long-lens crowd compression
  • Hook about overhearing / whispering → crowd whispering behind hands, long lens, faces half-visible
  • Hook about a deadline or financial threat → funeral director sliding a bill across a desk, close-up on the total
  • Hook about insider knowledge → over-shoulder shot of someone leaning in to share a secret at a table
- The hook B-roll image_prompt should be the single most cinematic, visually specific shot in the entire plan.
- ONLY use A-roll for scene 1 if the hook is a pure direct address with no strong visual metaphor (rare).

VARIETY MANDATE (critical — violations make the visual plan unusable):
- NEVER place two A-roll scenes back to back. Always break consecutive A-roll with at least one B-roll between them.
- A-roll MAXIMUM: no more than 40% of scenes should be A-roll. For a 7-scene plan, max 3 A-roll. Push the rest to creative B-roll.
- Each B-roll must use a DIFFERENT visual approach from all other B-roll scenes. No two B-roll scenes can share the same basic subject/setup. Examples of what makes scenes distinct: subject type (person vs. object vs. location), framing (close-up hands vs. wide crowd shot vs. over-shoulder), emotional register (grief vs. relief vs. shock vs. confusion).
- B-roll shotIdea MUST be specific to the script. If the script mentions a dollar amount ($25,000), reference it. If it names a person (Harold), build a shot around that name. If it mentions a location (funeral home, kitchen table), place the shot there specifically.
- A-roll variety: each A-roll scene must have a different physical setup. Examples: seated medium close-up / leaning forward / wide shot from the side / tight on hands with face in background. Never just "spokesperson speaks to camera" repeated.
- No two scenes should have the same shotIdea concept — every scene is a unique visual statement.

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
  3. The image_prompt MUST use this exact framing: over-the-shoulder shot from behind. Camera positioned behind and slightly to the side of the avatar. We see the back of the avatar's shoulder filling the near frame edge — avatar is in BACK-PROFILE, not side profile. Avatar holds a standard paper check at natural arm distance (waist to chest height). The check is a REALISTIC size — a normal bank check proportional to the person's hands, occupying 15–20% of the frame. NOT oversized, NOT poster-sized. The check is slightly angled toward camera so the amount is legible. Avatar's partial jaw and cheek are visible at the frame edge, expression showing quiet disbelief transitioning to acceptance. Warm interior light. Medium shot.
  4. The kling_prompt MUST describe this arc: "Avatar looks down at the check. A slight pause — 1 to 2 seconds of absolute stillness. Then a slow exhale through the nose, tiny smile forming or chin lowering in quiet relief. One small slow nod of acceptance. No large gestures. Very slow push-in toward the document."
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
- Every B-roll scene that features family members, loved ones, friends, or other characters (grandchildren, spouses, adult children, etc.) MUST describe those characters as visually consistent with the avatar's family: EXACTLY matching race and ethnicity, skin tone, hair color and texture. Do NOT copy the avatar's exact face — they are family members who resemble the avatar, not clones.
- CRITICAL — RACE AND SKIN EXTRACTION: Read the avatar description carefully for ethnicity markers. Examples:
  • "white woman", "Caucasian", "European" → fair/light skin, white/Caucasian family. Do NOT give them brown skin.
  • "African American", "Black woman" → deep brown skin, Black family.
  • "Hispanic", "Latina" → olive/warm brown skin, Hispanic family.
  • "Asian" → Asian features, Asian family.
  • "Indian", "South Asian" → South Asian features, South Asian family.
- When the avatar is a white/Caucasian woman: all family members (adult children, grandchildren, spouse) must have fair/light skin and Caucasian features. Use phrases like "fair-skinned adult daughter, same light complexion as the protagonist, clearly Caucasian".
- NEVER default to brown or dark skin tones for family members when the avatar description indicates a white or fair-skinned person.
- Maintain strict visual, racial, and ethnic consistency across every human subject in the full scene sequence.`;

// ── Prompt builder ───────────────────────────────────────────────────────

function buildVisualPlanPrompt(input: GenerateVisualPlanInput, startSceneNum = 1): string {
  const { campaign, hook, body, cta, avatarDescription } = input;
  const avatarSection = avatarDescription
    ? `\nAvatar / Spokesperson likeness:\n${avatarDescription}\nUse verbatim in every A-roll image_prompt. Extract race, skin tone, and hair traits to maintain family visual consistency in B-roll scenes featuring family members or loved ones.\n`
    : "";
  const sceneNumberNote = startSceneNum > 1
    ? `\nNote: Scenes ${1} through ${startSceneNum - 1} are pre-built cinematic intro scenes. Number your scenes starting at ${startSceneNum}.\n`
    : "";
  return `Campaign:
- Persona: ${campaign.personaId ?? "general"}
- Emotional tone: ${campaign.emotionalTone ?? "warm and empathetic"}
- Duration target: ${campaign.durationSeconds ?? 30}s
- Phone: ${campaign.phoneNumber ?? "1-800-555-0100"}
${avatarSection}${sceneNumberNote}
Script:
HOOK: ${hook}
BODY: ${body}
CTA: ${cta}

Create a scene-by-scene visual plan now.`;
}

function buildCinematicScenes(style: CinematicHookStyle): SceneCard[] {
  return style.scenes.map((scene, i) => ({
    sceneNumber: i + 1,
    lineReference: `[Cinematic Intro: ${style.name}]`,
    sceneType: "B-roll" as const,
    setting: scene.sceneLabel,
    shotIdea: scene.rawImagePrompt.slice(0, 80) + "…",
    emotion: "atmospheric",
    cameraStyle: "cinematic documentary",
    imagePrompt: buildImagePrompt(scene.rawImagePrompt, false),
    klingPrompt: buildKlingPrompt(scene.rawKlingPrompt + " " + scene.soundNote),
    useAvatarReference: false,
    useDocumentReference: false,
  }));
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

  return {
    overallDirection: String(parsed.overallDirection ?? ""),
    baseLayer: String(parsed.baseLayer ?? ""),
    aRollIdeas: Array.isArray(parsed.aRollIdeas) ? parsed.aRollIdeas.map(String) : [],
    bRollIdeas: Array.isArray(parsed.bRollIdeas) ? parsed.bRollIdeas.map(String) : [],
    scenes,
  };
}

// ── Family resemblance helper ─────────────────────────────────────────────
// Extracts race/skin/hair cues from an avatar description for B-roll family scenes.

function buildFamilyResemblanceNote(avatarDescription: string | null | undefined): string {
  if (!avatarDescription) return "";
  const lower = avatarDescription.toLowerCase();
  const cues: string[] = [];

  // ── Skin tone ──────────────────────────────────────────────────────────
  if (/dark\s*brown\s*skin|deep\s*brown\s*skin|ebony\s*skin|black\s*skin/i.test(avatarDescription)) {
    cues.push("same deep brown skin tone");
  } else if (/medium\s*brown\s*skin|warm\s*brown\s*skin|caramel\s*skin|tan\s*skin/i.test(avatarDescription)) {
    cues.push("same warm brown skin tone");
  } else if (/light\s*brown\s*skin|olive\s*skin|bronze\s*skin/i.test(avatarDescription)) {
    cues.push("same olive complexion");
  } else if (/fair\s*skin|pale\s*skin|light\s*skin|porcelain\s*skin/i.test(avatarDescription)) {
    cues.push("same fair skin");
  } else if (/white\s*woman|white\s*man|white\s*person|caucasian|white\s*elderly|white\s*senior|white\s*lady/i.test(avatarDescription)) {
    // "white woman", "caucasian", etc. without an explicit skin descriptor
    cues.push("same fair Caucasian skin tone");
  }

  // ── Hair ──────────────────────────────────────────────────────────────
  if (/black\s*hair/i.test(avatarDescription)) {
    cues.push("same dark black hair");
  } else if (/dark\s*brown\s*hair/i.test(avatarDescription)) {
    cues.push("same dark brown hair");
  } else if (/grey\s*hair|gray\s*hair|silver\s*hair|white\s*hair/i.test(avatarDescription)) {
    cues.push("same grey hair");
  } else if (/blonde\s*hair|blond\s*hair/i.test(avatarDescription)) {
    cues.push("same blonde hair");
  } else if (/red\s*hair|auburn\s*hair/i.test(avatarDescription)) {
    cues.push("same red/auburn hair");
  }

  // ── Ethnicity ─────────────────────────────────────────────────────────
  if (/african\s*american|black\s*american/i.test(lower)) {
    cues.push("African American family");
  } else if (/hispanic|latina|latino|mexican|puerto\s*rican/i.test(lower)) {
    cues.push("Hispanic family");
  } else if (/asian|chinese|korean|japanese|vietnamese|filipino/i.test(lower)) {
    cues.push("Asian family");
  } else if (/south\s*asian|indian|pakistani|bengali/i.test(lower)) {
    cues.push("South Asian family");
  } else if (/middle\s*eastern|arab/i.test(lower)) {
    cues.push("Middle Eastern family");
  } else if (/white\s*woman|white\s*man|white\s*person|caucasian/i.test(lower)) {
    cues.push("white/Caucasian family");
  }

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
    `Close-up of hands slowly opening an envelope — edge of a $25,000 check becoming visible, shallow depth of field`,
    `Funeral director sliding a bill across a dark desk — rack focus to the total amount, cold and precise`,
    `Widow walking calmly through whispering mourners — 85mm long lens, crowd turning to look, she doesn't stop`,
    `Stack of unopened bills on kitchen table — slow rack focus from blurred family photo to sharp bill totals`,
    `Family entering funeral home — one figure stops at the door, hand on the frame, a breath before stepping in`,
    `Close-up of a face reading a piece of paper — expression shifts from tension to quiet disbelief to relief`,
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
  const startSceneNum = input.cinematicHookStyle
    ? input.cinematicHookStyle.scenes.length + 1
    : 1;

  function prependCinematic(result: GeneratedVisualPlan): GeneratedVisualPlan {
    if (!input.cinematicHookStyle) return result;
    const cinematicScenes = buildCinematicScenes(input.cinematicHookStyle);
    const offset = cinematicScenes.length;
    return {
      ...result,
      scenes: [
        ...cinematicScenes,
        ...result.scenes.map((s) => ({ ...s, sceneNumber: s.sceneNumber + offset })),
      ],
    };
  }

  // ── OpenAI API path ──────────────────────────────────────────────────
  if (isProviderConfigured("generateVisualPlan")) {
    try {
      const raw = await generateTextWithOpenAI({
        system: SYSTEM,
        prompt: buildVisualPlanPrompt(input, startSceneNum),
        maxTokens: 8192,
        temperature: 0.6,
      });
      return prependCinematic(parseVisualPlanResponse(raw));
    } catch (err) {
      console.error("[generateVisualPlan] OpenAI error, trying Claude fallback:", err);
    }
  }

  // ── Claude fallback path ─────────────────────────────────────────────
  if (isClaudeConfigured()) {
    try {
      const raw = await generateTextWithClaude({
        system: SYSTEM,
        prompt: buildVisualPlanPrompt(input, startSceneNum),
        maxTokens: 8192,
        temperature: 0.6,
      });
      return prependCinematic(parseVisualPlanResponse(raw));
    } catch (err) {
      console.error("[generateVisualPlan] Claude error, falling back to mock:", err);
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 1400));
  return prependCinematic(mockVisualPlan(input));
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
- Build emotional variety across the 3 new ideas.${input.avatarDescription ? "\n- Apply the same family visual consistency rules as the main plan." : ""}

PATTERN INTERRUPTION REQUIREMENT:
Every B-roll idea must be VISUALLY STRIKING — a moment that stops the viewer mid-scroll. Prioritize:
• Shocking or emotionally loaded juxtapositions (check vs. funeral bill side by side)
• Crowd dynamics with social tension (people whispering, heads turning, sideways glances)
• Hands holding objects with financial or emotional weight (envelope, check, phone showing balance, bill)
• Faces in raw unguarded micro-moments (disbelief transitioning to relief, silent grief, quiet shock)
Avoid generic "elderly hands on coffee mug" type ideas unless the specific framing and action are cinematic.

KLING PROMPT FORMAT:
Use director-technique format: [Director tag] + camera movement + subject movement + emotional beat + sound note.
Director tags: [Spielberg] = slow push-in on face during revelation; [Fincher] = cold precise dolly, controlled dread; [Scorsese] = motivated tracking shot; [Nolan] = dramatic hold then reveal; [Villeneuve] = long silence, weight of empty space.
Example: "[Spielberg] Slow push-in as widow's fingers trace the check amount. She doesn't speak — the face says everything. Sound: single quiet exhale against near-silence."
Example: "[Fincher] Cold static wide of funeral director sliding a bill across a desk. Subject's hand enters frame. Sound: paper on wood, clock ticking."
Always end with a Sound note.`;

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

  async function parseMoreBRollResponse(rawText: string): Promise<GeneratedMoreBRoll> {
    const trimmed = rawText.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");
    let parsed: Array<Record<string, unknown>>;
    try {
      parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) throw new Error("Not an array");
    } catch {
      throw new Error(`Invalid JSON for generateMoreBRoll: ${rawText.slice(0, 200)}`);
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
  }

  // ── OpenAI path ──────────────────────────────────────────────────────
  if (isProviderConfigured("generateMoreBRoll")) {
    try {
      const rawText = await generateTextWithOpenAI({ system: systemPrompt, prompt: userPrompt });
      return parseMoreBRollResponse(rawText);
    } catch (err) {
      console.error("[generateMoreBRoll] OpenAI call failed, trying Claude:", err);
    }
  }

  // ── Claude fallback ──────────────────────────────────────────────────
  if (isClaudeConfigured()) {
    try {
      const raw = await generateTextWithClaude({ system: systemPrompt, prompt: userPrompt });
      return parseMoreBRollResponse(raw);
    } catch (err) {
      console.error("[generateMoreBRoll] Claude fallback also failed:", err);
      throw err;
    }
  }

  throw new Error("No AI provider configured. Add an OpenAI or Anthropic API key in Settings.");
}
