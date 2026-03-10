"use server";

import { revalidatePath } from "next/cache";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getAvatarById } from "@/lib/repositories/avatar-repo";
import { upsertVisualPlan, getLatestVisualPlanForScript } from "@/lib/repositories/visual-plan-repo";
import { generateVisualPlan, generateMoreBRoll } from "@/lib/services/visual-plan-generator";
import { generateSingleImage, uploadGeneratedImage } from "@/lib/services/gemini-image";
import { hasGeminiKey, resolveHeyGenApiKey, getSupabaseUrl } from "@/lib/config/env";
import type { FailResult } from "@/lib/result";
import { actionFail, actionOk, type ActionResult } from "@/lib/result";
import type { VisualPlan } from "@/types";
import type { SceneCard } from "@/types/scene";
import { loadUserKeys } from "./_load-keys";

// ── Generate ───────────────────────────────────────────────────────────────

export async function generateVisualPlanAction(
  campaignId: string,
  scriptId: string
): Promise<{ success: true; plan: VisualPlan } | FailResult> {
  try {
    await loadUserKeys();
    const [campaign, scripts] = await Promise.all([
      getCampaignById(campaignId),
      getScriptsByCampaign(campaignId),
    ]);

    if (!campaign) return { success: false, error: "Campaign not found." };

    const script = scripts.find((s) => s.id === scriptId);
    if (!script) return { success: false, error: "Script not found." };

    if (!script.hook && !script.body && !script.cta) {
      return { success: false, error: "Script has no content to build a visual plan from." };
    }

    const avatar = campaign.avatarId ? await getAvatarById(campaign.avatarId) : null;
    const avatarDescription = avatar?.expandedPrompt ?? avatar?.prompt ?? null;

    const generated = await generateVisualPlan({
      campaign,
      hook: script.hook ?? "",
      body: script.body ?? "",
      cta: script.cta ?? "",
      avatarDescription,
    });

    const plan = await upsertVisualPlan({
      campaignId,
      scriptId,
      overallDirection: generated.overallDirection,
      baseLayer: generated.baseLayer,
      aRoll: generated.aRollIdeas,
      bRoll: generated.bRollIdeas,
      scenes: generated.scenes,
    });

    revalidatePath(`/campaigns/${campaignId}/visual-plan`);
    return { success: true, plan };
  } catch (err) {
    console.error("generateVisualPlanAction:", err);
    return actionFail(err, "Failed to generate visual plan.");
  }
}

// ── Generate scene image ───────────────────────────────────────────────────

export async function generateSceneImageAction(
  campaignId: string,
  sceneIndex: number,
  imagePrompt: string,
  avatarId?: string | null,
  documentReferenceUrl?: string | null
): Promise<ActionResult<{ url: string }>> {
  try {
    await loadUserKeys();

    if (!hasGeminiKey()) {
      return actionFail(null, "No Gemini API key configured. Add one in Settings.");
    }

    // Fetch avatar images server-side to avoid passing large base64 data from client
    const refImages: string[] = [];
    if (avatarId) {
      const avatar = await getAvatarById(avatarId);
      const imageUrls = avatar?.imageUrls ?? [];
      await Promise.all(
        imageUrls.map(async (url) => {
          try {
            // Data URLs are already base64 — use directly; otherwise fetch from URL
            if (url.startsWith("data:")) {
              refImages.push(url);
            } else {
              const res = await fetch(url);
              const buf = await res.arrayBuffer();
              const mimeType = res.headers.get("content-type") ?? "image/jpeg";
              refImages.push(`data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`);
            }
          } catch {
            // Skip images that fail to fetch
          }
        })
      );
    }

    // Fetch document reference image if provided (must be first inlineData for Gemini grounding)
    let documentImage: string | null = null;
    if (documentReferenceUrl) {
      try {
        if (documentReferenceUrl.startsWith("data:")) {
          documentImage = documentReferenceUrl;
        } else {
          const res = await fetch(documentReferenceUrl);
          if (!res.ok) throw new Error(`Document fetch failed: ${res.status}`);
          const buf = await res.arrayBuffer();
          const mimeType = res.headers.get("content-type") ?? "image/jpeg";
          documentImage = `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`;
        }
      } catch {
        // If document fetch fails, proceed without it
        console.warn("[generateSceneImageAction] Failed to fetch document reference:", documentReferenceUrl);
      }
    }

    const documentAnchor = documentImage
      ? "CRITICAL: The first image provided is the EXACT document that must appear in this scene. Reproduce it photographically — same layout, same header, same dollar amount, same fields, same logo, same design. Do not invent or redesign any part of it. The check or letter in the generated image must be visually identical to the reference document image. Treat it as ground truth, not inspiration.\n\n"
      : "";
    const identityNote = refImages.length > 0
      ? "\n\nIMPORTANT: Maintain the exact same face and identity from the reference image."
      : "";
    const prompt = `${documentAnchor}${imagePrompt}${identityNote}`;

    const { base64, mimeType } = await generateSingleImage(prompt, refImages.length ? refImages : null, documentImage);
    const url = await uploadGeneratedImage(
      `generated/scenes/${campaignId}/${sceneIndex}-${Date.now()}.png`,
      base64,
      mimeType
    );

    return actionOk({ url });
  } catch (err) {
    console.error("generateSceneImageAction:", err);
    return actionFail(err, "Failed to generate scene image.");
  }
}

// ── Save (after manual edits) ──────────────────────────────────────────────

export async function saveVisualPlanAction(
  campaignId: string,
  scriptId: string,
  overallDirection: string,
  baseLayer: string,
  aRoll: string[],
  bRoll: string[],
  scenes: SceneCard[]
): Promise<{ success: true; plan: VisualPlan } | FailResult> {
  try {
    const plan = await upsertVisualPlan({
      campaignId,
      scriptId,
      overallDirection,
      baseLayer,
      aRoll,
      bRoll,
      scenes,
    });

    revalidatePath(`/campaigns/${campaignId}/visual-plan`);
    return { success: true, plan };
  } catch (err) {
    console.error("saveVisualPlanAction:", err);
    return actionFail(err, "Failed to save visual plan.");
  }
}

// ── Upload document asset ──────────────────────────────────────────────────

/**
 * Uploads a document reference image (check, approval letter, etc.) to Supabase Storage
 * and returns the public URL. The URL is stored on the SceneCard's documentReferenceUrl field.
 */
export async function uploadDocumentAssetAction(
  base64: string,
  mimeType: string,
  campaignId: string,
  sceneNumber: number
): Promise<ActionResult<{ url: string }>> {
  try {
    const url = await uploadGeneratedImage(
      `assets/documents/${campaignId}/${sceneNumber}.png`,
      base64,
      mimeType
    );
    return actionOk({ url });
  } catch (err) {
    console.error("uploadDocumentAssetAction:", err);
    return actionFail(err, "Failed to upload document asset.");
  }
}

// ── HeyGen talking video ───────────────────────────────────────────────────

export async function generateTalkingVideoAction(
  campaignId: string,
  sceneNumber: number,
  imageUrl: string,        // Supabase URL of the generated still
  audioBase64: string,     // base64-encoded audio file
  audioMimeType: string    // e.g. "audio/mpeg" or "audio/wav"
): Promise<ActionResult<{ videoId: string }>> {
  try {
    await loadUserKeys();
    const apiKey = resolveHeyGenApiKey();
    if (!apiKey) return actionFail(null, "No HeyGen API key configured. Add one in Settings.");

    // Validate imageUrl against the Supabase storage origin to prevent SSRF
    const supabaseUrl = getSupabaseUrl();
    if (supabaseUrl && !imageUrl.startsWith(supabaseUrl)) {
      return actionFail(null, "Invalid image URL.");
    }

    // Validate audioMimeType against an allowlist
    const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm"];
    if (!ALLOWED_AUDIO_TYPES.includes(audioMimeType)) {
      return actionFail(null, "Unsupported audio format. Use MP3, WAV, OGG, MP4, or WebM.");
    }

    // 1. Fetch still image from Supabase and upload to HeyGen
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);
    const imgBuf = await imgRes.arrayBuffer();

    const imgUpload = await fetch("https://upload.heygen.com/v1/asset", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "image/jpeg" },
      body: imgBuf,
    });
    if (!imgUpload.ok) throw new Error(`HeyGen image upload HTTP ${imgUpload.status}`);
    const imgData = await imgUpload.json();
    if (imgData.code !== 100) throw new Error(`HeyGen image upload failed: ${JSON.stringify(imgData)}`);
    const talkingPhotoId: string = imgData.data.image_key;

    // 2. Upload audio to HeyGen
    const audioBuf = Buffer.from(audioBase64, "base64");
    const audioUpload = await fetch("https://upload.heygen.com/v1/asset", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": audioMimeType },
      body: audioBuf,
    });
    if (!audioUpload.ok) throw new Error(`HeyGen audio upload HTTP ${audioUpload.status}`);
    const audioData = await audioUpload.json();
    if (audioData.code !== 100) throw new Error(`HeyGen audio upload failed: ${JSON.stringify(audioData)}`);
    const audioAssetId: string = audioData.data.id;

    // 3. Create Avatar IV video
    const videoRes = await fetch("https://api.heygen.com/v2/video/av4/generate", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ talking_photo_id: talkingPhotoId, audio_asset_id: audioAssetId }),
    });
    if (!videoRes.ok) throw new Error(`HeyGen video create HTTP ${videoRes.status}`);
    const videoData = await videoRes.json();
    if (videoData.code !== 100) throw new Error(`HeyGen video create failed: ${JSON.stringify(videoData)}`);

    return actionOk({ videoId: videoData.data.video_id });
  } catch (err) {
    console.error("generateTalkingVideoAction:", err);
    return actionFail(err, "Failed to start talking video generation.");
  }
}

export async function checkVideoStatusAction(
  videoId: string
): Promise<ActionResult<{ status: string; videoUrl?: string }>> {
  try {
    await loadUserKeys();
    const apiKey = resolveHeyGenApiKey();
    if (!apiKey) return actionFail(null, "No HeyGen API key configured.");

    const res = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      { headers: { "X-API-KEY": apiKey } }
    );
    if (!res.ok) throw new Error(`HeyGen status check HTTP ${res.status}`);
    const data = await res.json();
    if (data.code !== 100) throw new Error(`HeyGen status check failed: ${JSON.stringify(data)}`);

    return actionOk({
      status: data.data.status,
      videoUrl: data.data.video_url ?? undefined,
    });
  } catch (err) {
    console.error("checkVideoStatusAction:", err);
    return actionFail(err, "Failed to check video status.");
  }
}

// ── Generate more B-roll ideas ──────────────────────────────────────────────

export async function generateMoreBRollAction(
  campaignId: string,
  scriptId: string
): Promise<ActionResult<{ plan: VisualPlan }>> {
  try {
    await loadUserKeys();
    const [campaign, scripts] = await Promise.all([
      getCampaignById(campaignId),
      getScriptsByCampaign(campaignId),
    ]);
    if (!campaign) return actionFail(null, "Campaign not found.");
    const script = scripts.find((s) => s.id === scriptId);
    if (!script) return actionFail(null, "Script not found.");

    const avatar = campaign.avatarId ? await getAvatarById(campaign.avatarId) : null;
    const avatarDescription = avatar?.expandedPrompt ?? avatar?.prompt ?? null;

    const existing = await getLatestVisualPlanForScript(campaignId, scriptId);
    const existingBRoll = existing?.bRoll ?? [];
    const existingScenes = existing?.sceneBreakdown ?? [];
    const startSceneNumber = (existingScenes.at(-1)?.sceneNumber ?? existingScenes.length) + 1;

    const { newIdeas, newScenes } = await generateMoreBRoll({
      campaign,
      hook: script.hook ?? "",
      body: script.body ?? "",
      cta: script.cta ?? "",
      avatarDescription,
      existingBRollIdeas: existingBRoll,
      startSceneNumber,
    });

    const plan = await upsertVisualPlan({
      campaignId,
      scriptId,
      overallDirection: existing?.overallDirection ?? null,
      baseLayer: existing?.baseLayer ?? null,
      aRoll: existing?.aRoll ?? null,
      bRoll: [...existingBRoll, ...newIdeas],
      scenes: [...existingScenes, ...newScenes],
    });

    revalidatePath(`/campaigns/${campaignId}/visual-plan`);
    return actionOk({ plan });
  } catch (err) {
    console.error("generateMoreBRollAction:", err);
    return actionFail(err, "Failed to generate more B-roll ideas.");
  }
}
