/**
 * Scene prompt pack generation service.
 *
 * ── Provider: OpenAI API ─────────────────────────────────────────────────
 *
 * Takes an existing script + visual plan scenes + optional voiceover and
 * assembles a production-ready prompt pack:
 *   — Refined Seedream / NanoBanana image prompts (per scene)
 *   — Kling image-to-video motion prompts (per scene)
 *   — ElevenLabs emotion-tagged voiceover for the full script
 *
 * Falls back to deterministic wrapping when OPENAI_API_KEY is not set.
 *
 * Interface contract:
 *   input:  GenerateScenePromptPackInput
 *   output: GeneratedScenePromptPack  (scenes[], voScript)
 */

import type { Campaign, Script } from "@/types";
import type { SceneCard } from "@/types/scene";
import type { ScenePrompt, ScenePromptPack } from "@/types/prompt";
import { buildImagePrompt, buildKlingPrompt } from "./prompt-style-guide";
import { generateTextWithOpenAI, isProviderConfigured } from "@/lib/llm";

// ── Types ─────────────────────────────────────────────────────────────────

export interface GenerateScenePromptPackInput {
  campaign: Campaign;
  script: Script;
  scenes: SceneCard[];
  existingVoScript: string | null;
}

export type GeneratedScenePromptPack = Omit<ScenePromptPack, "visualPlanId">;

// ── System prompt ────────────────────────────────────────────────────────

const SYSTEM = `You are an expert production prompt engineer for AI image generation and AI video generation. You write prompts for two tools:

1. IMAGE PROMPTS (Seedream / NanoBanana — still image generators)
   Write a vivid, specific scene description. Include:
   - Subject (who is in frame, age, appearance, expression)
   - Setting (specific environment details, objects, textures)
   - Framing (close-up, medium, wide, over-the-shoulder)
   - Lighting source and quality (e.g. "warm lamplight from the left", "overcast window light")
   DO NOT include technical style rules (50mm, documentary, aspect ratio, no watermarks) — those are applied automatically by our pipeline.
   Keep it tool-agnostic: no tool-specific syntax, just a rich visual description.

2. KLING PROMPTS (cinematic image-to-video — motion generation)
   Write a motion description for converting the still image to a 5-second clip. Include:
   - What physical motion occurs (a hand moves, eyes glance down, chest rises with a breath)
   - Camera movement if any (very slow push-in, very slow pan, static hold)
   - Pacing and rhythm (gentle, unhurried, still)
   DO NOT include stabilization rules, 50mm, or "no shake" — those are applied automatically.
   Prioritize documentary realism: subtle, grounded movement. Nothing dramatic or fast.

For each scene, return BOTH an image_prompt and a kling_prompt.

Also return a voScript field with an ElevenLabs-ready emotion-tagged voiceover if one is not already provided. Use the format:
<emotion direction>
Sentence text here.

Return a JSON object:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "image_prompt": "...",
      "kling_prompt": "..."
    }
  ],
  "voScript": "..." or null
}

No markdown fences, no commentary — only valid JSON.`;

// ── Prompt builder ───────────────────────────────────────────────────────

function buildScenePromptPackPrompt(input: GenerateScenePromptPackInput): string {
  const { campaign, script, scenes, existingVoScript } = input;

  const sceneList = scenes.map((s) => {
    const lines = [
      `Scene ${s.sceneNumber} (${s.sceneType})`,
      `  Line: "${s.lineReference}"`,
      `  Setting: ${s.setting}`,
      `  Emotion: ${s.emotion}`,
    ];
    if (s.shotIdea) lines.push(`  Shot idea: ${s.shotIdea}`);
    if (s.cameraStyle) lines.push(`  Camera: ${s.cameraStyle}`);
    return lines.join("\n");
  }).join("\n\n");

  return `Campaign:
- Persona: ${campaign.personaId ?? "general"}
- Emotional tone: ${campaign.emotionalTone ?? "warm and empathetic"}
- Duration target: ${campaign.durationSeconds ?? 30}s

Script:
HOOK: ${script.hook ?? ""}
BODY: ${script.body ?? ""}
CTA: ${script.cta ?? ""}

Scenes to refine:
${sceneList}

${existingVoScript ? "VO script already exists — return voScript as null." : "No VO script yet — generate an ElevenLabs emotion-tagged version with section headers (── HOOK ──, ── BODY ──, ── CALL TO ACTION ──)."}`;
}

// ── Response parser ──────────────────────────────────────────────────────

interface RawSceneResponse {
  sceneNumber?: unknown;
  image_prompt?: unknown;
  kling_prompt?: unknown;
  // Legacy field names from older prompt versions
  imageDesc?: unknown;
  klingDesc?: unknown;
}

function parsePromptPackResponse(
  text: string,
  originalScenes: SceneCard[],
  existingVoScript: string | null
): GeneratedScenePromptPack {
  const trimmed = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");

  let parsed: { scenes?: RawSceneResponse[]; voScript?: unknown };
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(
      `OpenAI returned invalid JSON for scene prompt generation. Raw response: ${text.slice(0, 200)}`
    );
  }

  if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error("OpenAI returned no scenes in scene prompt generation response.");
  }

  const refinedScenes: ScenePrompt[] = originalScenes.map((scene) => {
    const match = parsed.scenes!.find(
      (s) => Number(s.sceneNumber) === scene.sceneNumber
    );

    // Accept both new (image_prompt/kling_prompt) and legacy (imageDesc/klingDesc) field names
    const rawImage = String(match?.image_prompt ?? match?.imageDesc ?? scene.imagePrompt);
    const rawKling = String(match?.kling_prompt ?? match?.klingDesc ?? scene.klingPrompt);

    return {
      sceneNumber: scene.sceneNumber,
      lineReference: scene.lineReference,
      sceneType: scene.sceneType,
      setting: scene.setting,
      emotion: scene.emotion,
      imagePrompt: buildImagePrompt(rawImage, scene.sceneType === "A-roll"),
      klingPrompt: buildKlingPrompt(rawKling),
    };
  });

  const voScript = existingVoScript ?? String(parsed.voScript ?? "");

  return { scenes: refinedScenes, voScript };
}

// ── ElevenLabs VO tagger (mock) ──────────────────────────────────────────

function tagSection(text: string, tags: string[]): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sentences
    .map((sentence, i) => {
      const tag = tags[Math.min(i, tags.length - 1)];
      return `<${tag}>\n${sentence}`;
    })
    .join("\n\n");
}

function buildTaggedScript(hook: string, body: string, cta: string): string {
  const taggedHook = tagSection(hook, [
    "subtle warmth, speaking directly to the viewer",
    "gentle pause — let the question land",
  ]);

  const taggedBody = tagSection(body, [
    "intimate, confessional tone",
    "weight of reality — measured, somber",
    "shift to offering relief, warmer",
    "reassuring, matter-of-fact simplicity",
    "quiet sincerity",
  ]);

  const taggedCta = tagSection(cta, [
    "warm urgency — not pushy, but sincere",
    "clear and deliberate — every word counts",
  ]);

  return [
    "── HOOK ─────────────────────────────────────────",
    taggedHook,
    "",
    "── BODY ─────────────────────────────────────────",
    taggedBody,
    "",
    "── CALL TO ACTION ───────────────────────────────",
    taggedCta,
  ].join("\n");
}

function mockPromptPack(input: GenerateScenePromptPackInput): GeneratedScenePromptPack {
  const { script, scenes, existingVoScript } = input;

  const scenePrompts: ScenePrompt[] = scenes.map((scene) => ({
    sceneNumber: scene.sceneNumber,
    lineReference: scene.lineReference,
    sceneType: scene.sceneType,
    setting: scene.setting,
    emotion: scene.emotion,
    imagePrompt: buildImagePrompt(scene.imagePrompt, scene.sceneType === "A-roll"),
    klingPrompt: buildKlingPrompt(scene.klingPrompt),
  }));

  const voScript =
    existingVoScript ??
    buildTaggedScript(
      script.hook ?? "",
      script.body ?? "",
      script.cta ?? ""
    );

  return { scenes: scenePrompts, voScript };
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Generates a production-ready prompt pack for all scenes.
 * Uses OpenAI API when OPENAI_API_KEY is set, otherwise wraps with style-guide rules.
 */
export async function generateScenePromptPack(
  input: GenerateScenePromptPackInput
): Promise<GeneratedScenePromptPack> {
  // ── OpenAI API path ──────────────────────────────────────────────────
  if (isProviderConfigured("generateScenePromptPack")) {
    try {
      const raw = await generateTextWithOpenAI({
        system: SYSTEM,
        prompt: buildScenePromptPackPrompt(input),
        maxTokens: 8192,
        temperature: 0.5,
      });
      return parsePromptPackResponse(raw, input.scenes, input.existingVoScript);
    } catch (err) {
      console.error("[generateScenePromptPack] OpenAI error, falling back to mock:", err);
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 1000));
  return mockPromptPack(input);
}
