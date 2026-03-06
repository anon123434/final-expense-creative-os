import type { Campaign, CampaignTrigger, AdConcept, Script, VoiceoverScript, VisualPlan } from "@/types";
import type { ScenePromptPack } from "@/types/prompt";

// ── Snapshot ───────────────────────────────────────────────────────────────
// Full serialized state of a campaign at the time the version was saved.
// schemaVersion lets us migrate old snapshots if the shape changes.

export interface CampaignSnapshot {
  schemaVersion: 1;
  savedAt: string;
  campaign: Campaign;
  triggers: CampaignTrigger[];
  selectedConcept: AdConcept | null;
  script: Script | null;
  voScript: VoiceoverScript | null;
  visualPlan: VisualPlan | null;
  promptPack: ScenePromptPack | null;
}

// ── Domain type ────────────────────────────────────────────────────────────

export interface CampaignVersion {
  id: string;
  campaignId: string;
  name: string;
  snapshot: CampaignSnapshot;
  createdAt: string;
}

// ── Helper ─────────────────────────────────────────────────────────────────

export function parseSnapshot(raw: Record<string, unknown>): CampaignSnapshot | null {
  if (!raw || raw.schemaVersion !== 1) return null;
  return raw as unknown as CampaignSnapshot;
}
