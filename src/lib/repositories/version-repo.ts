/**
 * Version repository — data access layer.
 * Tries Supabase first when env vars are present, falls back to mock data.
 */

import type { CampaignVersion, CampaignSnapshot } from "@/types/version";
import { toCampaignVersion } from "@/lib/mappers";
import { mockVersionRows } from "@/lib/mock/version-mock";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getVersionsByCampaign(campaignId: string): Promise<CampaignVersion[]> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_versions")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    if (!error && data) return data.map(toCampaignVersion);
    console.warn("Supabase getVersionsByCampaign failed, using mock:", error?.message);
  }
  await new Promise((r) => setTimeout(r, 100));
  return mockVersionRows
    .filter((r) => r.campaign_id === campaignId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toCampaignVersion);
}

export async function getVersionById(
  campaignId: string,
  versionId: string
): Promise<CampaignVersion | null> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_versions")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("id", versionId)
      .single();
    if (!error && data) return toCampaignVersion(data);
    if (error?.code !== "PGRST116") {
      console.warn("Supabase getVersionById failed:", error?.message);
    }
    return null;
  }
  const row = mockVersionRows.find(
    (r) => r.campaign_id === campaignId && r.id === versionId
  );
  return row ? toCampaignVersion(row) : null;
}

export async function saveVersion(
  campaignId: string,
  name: string,
  snapshot: CampaignSnapshot
): Promise<CampaignVersion> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_versions")
      .insert({
        campaign_id: campaignId,
        name,
        snapshot: snapshot as unknown as Record<string, unknown>,
      })
      .select()
      .single();
    if (!error && data) return toCampaignVersion(data);
    console.warn("Supabase saveVersion failed, using mock:", error?.message);
  }

  await new Promise((r) => setTimeout(r, 200));
  const mockRow = {
    id: `ver-${Date.now()}`,
    campaign_id: campaignId,
    name,
    snapshot: snapshot as unknown as Record<string, unknown>,
    created_at: new Date().toISOString(),
  };
  mockVersionRows.push(mockRow);
  return toCampaignVersion(mockRow);
}
