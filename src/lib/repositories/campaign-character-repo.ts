import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";
import type { CampaignCharacter } from "@/types/campaign-character";
import type { CampaignCharacterRow } from "@/types/database";

function toModel(row: CampaignCharacterRow): CampaignCharacter {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    referenceImageUrl: row.reference_image_url,
    createdAt: row.created_at,
  };
}

export async function getCharactersByCampaign(campaignId: string): Promise<CampaignCharacter[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaign_characters")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toModel);
}

export async function createCharacter(data: {
  campaignId: string;
  name: string;
  referenceImageUrl: string | null;
}): Promise<CampaignCharacter> {
  const supabase = await getSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("campaign_characters")
    .insert({
      campaign_id: data.campaignId,
      name: data.name,
      reference_image_url: data.referenceImageUrl,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toModel(row as CampaignCharacterRow);
}

export async function deleteCharacter(id: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("campaign_characters").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getCharactersByIds(ids: string[]): Promise<CampaignCharacter[]> {
  if (!ids.length || !hasSupabaseConfig()) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaign_characters")
    .select("*")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toModel(row as CampaignCharacterRow));
}
