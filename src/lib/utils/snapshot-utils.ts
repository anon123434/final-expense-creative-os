/**
 * Pure client-safe snapshot helpers.
 * No server imports — safe to use in Client Components.
 */

import type { CampaignSnapshot } from "@/types/version";

export interface SnapshotSummary {
  conceptTitle: string | null;
  scriptHook: string | null;
  sceneCount: number;
  hasVoScript: boolean;
  hasPromptPack: boolean;
  triggerCount: number;
}

export function summarizeSnapshot(snapshot: CampaignSnapshot): SnapshotSummary {
  return {
    conceptTitle: snapshot.selectedConcept?.title ?? null,
    scriptHook: snapshot.script?.hook ?? null,
    sceneCount: snapshot.visualPlan?.sceneBreakdown?.length ?? 0,
    hasVoScript: !!snapshot.voScript?.taggedScript,
    hasPromptPack: (snapshot.promptPack?.scenes?.length ?? 0) > 0,
    triggerCount: snapshot.triggers?.length ?? 0,
  };
}
