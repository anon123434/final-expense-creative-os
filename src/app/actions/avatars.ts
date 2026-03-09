"use server";

import { revalidatePath } from "next/cache";
import { createAvatar, getAvatarsByUser, deleteAvatar, attachAvatarToCampaign, updateAvatarImages } from "@/lib/repositories/avatar-repo";
import { generateAvatar } from "@/lib/services/avatar-generator";
import { actionFail, actionOk, type ActionResult } from "@/lib/result";
import type { Avatar } from "@/types/avatar";
import type { AvatarMode, AspectRatio } from "@/types/avatar";
import { loadUserKeys } from "./_load-keys";

async function getCurrentUserId(): Promise<string> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? "00000000-0000-0000-0000-000000000001";
  } catch {
    return "00000000-0000-0000-0000-000000000001";
  }
}

// ── Generate ────────────────────────────────────────────────────────────────

export async function generateAvatarAction(input: {
  prompt: string;
  mode: AvatarMode;
  aspectRatio: AspectRatio;
  referenceImageBase64?: string | null;
  name?: string;
}): Promise<ActionResult<{ avatar: Avatar; usedMock: boolean }>> {
  try {
    await loadUserKeys();
    const userId = await getCurrentUserId();

    const avatar = await createAvatar({
      user_id: userId,
      name: input.name || `Avatar · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      prompt: input.prompt,
      mode: input.mode,
      aspect_ratio: input.aspectRatio,
      reference_image_url: null,
      image_urls: [],
    });

    const result = await generateAvatar({
      prompt: input.prompt,
      mode: input.mode,
      aspectRatio: input.aspectRatio,
      referenceImageBase64: input.referenceImageBase64,
      avatarId: avatar.id,
    });

    const imageUrls = result.images
      .filter((img): img is { index: number; label: string; base64: string; mimeType: string } => "base64" in img)
      .map((img) => img.base64);

    await updateAvatarImages(avatar.id, imageUrls);

    const updatedAvatar: Avatar = { ...avatar, imageUrls, expandedPrompt: result.expandedPrompts[0] ?? null };

    revalidatePath("/avatars");
    return actionOk({ avatar: updatedAvatar, usedMock: result.usedMock });
  } catch (err) {
    console.error("generateAvatarAction:", err);
    return actionFail(err, "Failed to generate avatar.");
  }
}

// ── List ────────────────────────────────────────────────────────────────────

export async function getAvatarsAction(): Promise<ActionResult<Avatar[]>> {
  try {
    const userId = await getCurrentUserId();
    const avatars = await getAvatarsByUser(userId);
    return actionOk(avatars);
  } catch (err) {
    return actionFail(err, "Failed to load avatars.");
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteAvatarAction(avatarId: string): Promise<ActionResult<null>> {
  try {
    await deleteAvatar(avatarId);
    revalidatePath("/avatars");
    return actionOk(null);
  } catch (err) {
    return actionFail(err, "Failed to delete avatar.");
  }
}

// ── Attach to campaign ──────────────────────────────────────────────────────

export async function attachAvatarAction(
  campaignId: string,
  avatarId: string | null
): Promise<ActionResult<null>> {
  try {
    await attachAvatarToCampaign(campaignId, avatarId);
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/visual-plan`);
    return actionOk(null);
  } catch (err) {
    return actionFail(err, "Failed to attach avatar.");
  }
}
