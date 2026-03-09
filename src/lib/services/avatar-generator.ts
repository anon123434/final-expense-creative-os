import OpenAI from "openai";
import { resolveOpenAIApiKey, hasGeminiKey } from "@/lib/config/env";
import { generateSingleImage, uploadGeneratedImage } from "@/lib/services/gemini-image";
import type { AvatarMode, AspectRatio } from "@/types/avatar";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GenerateAvatarInput {
  prompt: string;
  mode: AvatarMode;
  aspectRatio: AspectRatio;
  referenceImageBase64?: string | null; // full data URL, e.g. "data:image/jpeg;base64,..."
  avatarId: string; // pre-generated UUID for storage paths
}

export interface GeneratedImage {
  index: number;
  label: string;
  base64: string;   // URL or data URL of the image
  mimeType: string;
}

export interface GenerateAvatarResult {
  expandedPrompts: string[];
  images: (GeneratedImage | { index: number; label: string; error: string })[];
  usedMock: boolean;
}

// ── Labels ─────────────────────────────────────────────────────────────────

const LIKENESS_LABELS = ["Front", "3/4 Angle", "Side Profile", "Relaxed Pose"];
const ENVIRONMENT_LABELS = ["Scene 1", "Scene 2", "Scene 3", "Scene 4"];

// ── Mock fallback ──────────────────────────────────────────────────────────

// Visible grey placeholder SVG — makes mock mode obvious instead of showing blank boxes
function makeMockSvg(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#1a1a1a"/>
  <rect x="1" y="1" width="638" height="358" fill="none" stroke="#333" stroke-width="2" stroke-dasharray="8 4"/>
  <text x="320" y="160" font-family="monospace" font-size="13" fill="#555" text-anchor="middle">MOCK · NO GEMINI KEY</text>
  <text x="320" y="185" font-family="monospace" font-size="11" fill="#444" text-anchor="middle">${label}</text>
  <text x="320" y="215" font-family="monospace" font-size="10" fill="#333" text-anchor="middle">Add Gemini API key in Settings</text>
</svg>`;
  const b64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

function getMockResult(mode: AvatarMode): GenerateAvatarResult {
  const labels = mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;
  return {
    expandedPrompts: labels.map((l) => `[MOCK] ${l} prompt`),
    images: labels.map((label, index) => ({
      index,
      label,
      base64: makeMockSvg(label),
      mimeType: "image/svg+xml",
    })),
    usedMock: true,
  };
}

// ── OpenAI prompt expansion ────────────────────────────────────────────────

async function expandPrompts(input: GenerateAvatarInput): Promise<string[]> {
  const openaiKey = resolveOpenAIApiKey();
  if (!openaiKey) {
    const labels = input.mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;
    return labels.map((l) => `${input.prompt} — ${l}`);
  }

  const client = new OpenAI({ apiKey: openaiKey });
  const hasRef = !!input.referenceImageBase64;

  const systemPrompt = input.mode === "likeness_only"
    ? `You are an expert at writing Gemini image generation prompts for character model sheets.
Given a user's description${hasRef ? " and reference image" : ""}, produce exactly 4 prompts for a professional character sheet.
Each prompt must produce a photorealistic portrait of the SAME person:
- Prompt 1: direct front-facing headshot, plain white studio background, soft even lighting, ultra high detail
- Prompt 2: 3/4 angle from front-left, plain white studio background, same person, professional lighting
- Prompt 3: exact side profile (90 degrees), plain white studio background, same person
- Prompt 4: relaxed neutral full-body pose, plain white studio background, same person
Rules: plain white background ONLY, consistent identity across all 4, ultra-realistic, 8K quality, no props.
Return a JSON object: { "prompts": ["prompt1", "prompt2", "prompt3", "prompt4"] }`
    : `You are an expert at writing Gemini image generation prompts for photorealistic character scenes.
Given a user's description${hasRef ? " and reference image" : ""}, produce exactly 4 prompts placing the SAME character in different environments.
Each prompt must maintain strict facial and body consistency across all scenes.
Infer environments from the description or use: living room, city street, kitchen, office.
Aspect ratio: ${input.aspectRatio}. Ultra-realistic, cinematic lighting, photojournalism quality.
Return a JSON object: { "prompts": ["prompt1", "prompt2", "prompt3", "prompt4"] }`;

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];

  if (hasRef && input.referenceImageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: input.referenceImageBase64, detail: "high" },
    });
  }

  userContent.push({ type: "text", text: input.prompt });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { prompts?: string[] };
  const prompts = parsed.prompts ?? [];

  const labels = input.mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;
  return labels.map((l, i) => prompts[i] ?? `${input.prompt} — ${l}`);
}


// ── Main export ────────────────────────────────────────────────────────────

export async function generateAvatar(
  input: GenerateAvatarInput
): Promise<GenerateAvatarResult> {
  if (!hasGeminiKey()) {
    console.warn("No Gemini key — returning mock avatar images");
    return getMockResult(input.mode);
  }

  const expandedPrompts = await expandPrompts(input);

  const labels = input.mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;

  const results = await Promise.all(
    expandedPrompts.map(async (prompt, index) => {
      try {
        const { base64, mimeType } = await generateSingleImage(
          prompt,
          input.referenceImageBase64
        );
        const url = await uploadGeneratedImage(`generated/${input.avatarId}/${index}.png`, base64, mimeType);
        return { index, label: labels[index], base64: url, mimeType };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generation failed";
        return { index, label: labels[index], error: message };
      }
    })
  );

  return {
    expandedPrompts,
    images: results.map((r) => {
      if ("error" in r) return { index: r.index, label: r.label, error: r.error as string };
      return { index: r.index, label: r.label, base64: r.base64, mimeType: r.mimeType };
    }),
    usedMock: false,
  };
}
