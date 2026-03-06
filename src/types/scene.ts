// ── Scene card ─────────────────────────────────────────────────────────────
// Each scene in a visual plan. Stored serialized inside visual_plans.scene_breakdown.

export interface SceneCard {
  sceneNumber: number;
  lineReference: string;
  sceneType: "A-roll" | "B-roll";
  setting: string;
  shotIdea: string;
  emotion: string;
  cameraStyle: string;
  imagePrompt: string;  // NanoBanana-ready
  klingPrompt: string;  // Kling 3.0 image-to-video prompt
}

// ── Visual plan ────────────────────────────────────────────────────────────
// Top-level document stored in the visual_plans table.

export interface VisualPlan {
  id: string;
  campaignId: string;
  scriptId: string;
  overallDirection: string | null;
  baseLayer: string | null;
  aRoll: string[] | null;
  bRoll: string[] | null;
  sceneBreakdown: SceneCard[] | null;
  createdAt: string;
}
