import type { Avatar } from "@/types/avatar";
import type { AvatarInsert } from "@/types/database";
import { toAvatar } from "@/lib/mappers";
import { mockAvatarRows } from "@/lib/mock/avatar-mock";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getAvatarsByUser(userId: string): Promise<Avatar[]> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("avatars")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) return data.map(toAvatar);
    console.warn("Supabase getAvatarsByUser failed, using mock:", error?.message);
  }

  return mockAvatarRows.filter((r) => r.user_id === userId).map(toAvatar);
}

export async function getAvatarById(id: string): Promise<Avatar | null> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("avatars")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) return toAvatar(data);
    console.warn("Supabase getAvatarById failed, using mock:", error?.message);
  }

  const row = mockAvatarRows.find((r) => r.id === id);
  return row ? toAvatar(row) : null;
}

export async function createAvatar(data: AvatarInsert): Promise<Avatar> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("avatars")
      .insert(data)
      .select()
      .single();

    if (!error && row) return toAvatar(row);
    console.warn("Supabase createAvatar failed, using mock:", error?.message);
  }

  const row = {
    id: `avatar-${Date.now()}`,
    user_id: data.user_id,
    name: data.name,
    prompt: data.prompt,
    expanded_prompt: data.expanded_prompt ?? null,
    mode: data.mode,
    aspect_ratio: data.aspect_ratio,
    reference_image_url: data.reference_image_url ?? null,
    image_urls: data.image_urls ?? [],
    created_at: new Date().toISOString(),
  };
  mockAvatarRows.push(row);
  return toAvatar(row);
}

export async function updateAvatarImages(id: string, imageUrls: string[]): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    await supabase.from("avatars").update({ image_urls: imageUrls }).eq("id", id);
    return;
  }
  const row = mockAvatarRows.find((r) => r.id === id);
  if (row) row.image_urls = imageUrls;
}

export async function deleteAvatar(id: string): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    await supabase.from("avatars").delete().eq("id", id);
    return;
  }
  const idx = mockAvatarRows.findIndex((r) => r.id === id);
  if (idx !== -1) mockAvatarRows.splice(idx, 1);
}

export async function attachAvatarToCampaign(
  campaignId: string,
  avatarId: string | null
): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    await supabase
      .from("campaigns")
      .update({ avatar_id: avatarId })
      .eq("id", campaignId);
    return;
  }
  // Mock fallback
  const { mockCampaignRows } = await import("@/lib/mock/campaigns");
  const campaign = mockCampaignRows.find((c: { id: string }) => c.id === campaignId);
  if (campaign) (campaign as Record<string, unknown>).avatar_id = avatarId;
}
