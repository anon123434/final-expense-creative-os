import OpenAI from "openai";
import { resolveOpenAIApiKey, resolveGeminiApiKey, hasGeminiKey } from "@/lib/config/env";
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

// A 1×1 transparent PNG in base64
const MOCK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function getMockResult(mode: AvatarMode): GenerateAvatarResult {
  const labels = mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;
  return {
    expandedPrompts: labels.map((l) => `[MOCK] ${l} prompt`),
    images: labels.map((label, index) => ({
      index,
      label,
      base64: `data:image/png;base64,${MOCK_PNG_BASE64}`,
      mimeType: "image/png",
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

// ── Gemini image generation ────────────────────────────────────────────────

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

async function callGemini(
  prompt: string,
  referenceImageBase64: string | null | undefined
): Promise<{ base64: string; mimeType: string }> {
  const apiKey = resolveGeminiApiKey()!;

  const parts: GeminiPart[] = [];

  if (referenceImageBase64) {
    const match = referenceImageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
    }
  }

  parts.push({ text: prompt });

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ inline_data?: { mime_type: string; data: string } }> };
    }>;
  };

  const imagePart = json.candidates?.[0]?.content?.parts?.find((p) => p.inline_data);
  if (!imagePart?.inline_data) {
    throw new Error("Gemini returned no image in response");
  }

  return {
    base64: imagePart.inline_data.data,
    mimeType: imagePart.inline_data.mime_type,
  };
}

// ── Storage upload ─────────────────────────────────────────────────────────

async function uploadToStorage(
  avatarId: string,
  index: number,
  base64: string,
  mimeType: string
): Promise<string> {
  try {
    const { hasSupabaseConfig, getSupabaseServerClient } = await import(
      "@/lib/supabase/repo-helpers"
    );
    if (!hasSupabaseConfig()) {
      return `data:${mimeType};base64,${base64}`;
    }

    const supabase = await getSupabaseServerClient();
    const buffer = Buffer.from(base64, "base64");
    const path = `generated/${avatarId}/${index}.png`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, buffer, { contentType: "image/png", upsert: true });

    if (error) {
      console.warn("Storage upload failed, using data URL:", error.message);
      return `data:${mimeType};base64,${base64}`;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    return publicUrl;
  } catch {
    return `data:${mimeType};base64,${base64}`;
  }
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
        const { base64, mimeType } = await callGemini(
          prompt,
          input.referenceImageBase64
        );
        const url = await uploadToStorage(input.avatarId, index, base64, mimeType);
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
      if ("error" in r) return { index: r.index, label: r.label, error: r.error };
      return { index: r.index, label: r.label, base64: r.base64, mimeType: r.mimeType };
    }),
    usedMock: false,
  };
}
