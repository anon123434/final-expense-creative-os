import { resolveGeminiApiKey } from "@/lib/config/env";

// ── Gemini image generation ─────────────────────────────────────────────────

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/**
 * Call Gemini image generation and return raw base64 + mimeType.
 * Accepts an optional reference image as a data URL ("data:image/jpeg;base64,...").
 */
export async function generateSingleImage(
  prompt: string,
  referenceImageBase64?: string | null
): Promise<{ base64: string; mimeType: string }> {
  const apiKey = resolveGeminiApiKey()!;

  const parts: GeminiPart[] = [];

  if (referenceImageBase64) {
    const match = referenceImageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
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
    console.error(`[Gemini] HTTP ${res.status}:`, text.slice(0, 500));
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> };
    }>;
  };

  const imagePart = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!imagePart?.inlineData) {
    throw new Error("Gemini returned no image in response");
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}

// ── Supabase Storage upload ─────────────────────────────────────────────────

/**
 * Upload base64 image data to Supabase Storage under the "avatars" bucket.
 * Falls back to a data URL if Supabase is not configured or upload fails.
 *
 * @param storagePath - path within the bucket, e.g. "generated/scenes/camp-1/0.png"
 */
export async function uploadGeneratedImage(
  storagePath: string,
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

    const { error } = await supabase.storage
      .from("avatars")
      .upload(storagePath, buffer, { contentType: "image/png", upsert: true });

    if (error) {
      console.warn("Storage upload failed, using data URL:", error.message);
      return `data:${mimeType};base64,${base64}`;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(storagePath);
    return publicUrl;
  } catch {
    return `data:${mimeType};base64,${base64}`;
  }
}
