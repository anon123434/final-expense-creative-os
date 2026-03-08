import type { VisualPlanRow } from "@/types/database";

const DEFAULT_VISUAL_PLANS: VisualPlanRow[] = [
  {
    id: "vp-1",
    campaign_id: "camp-1",
    script_id: "script-1",
    overall_direction: "Warm, emotional, kitchen-table feel. Golden hour lighting throughout.",
    base_layer: "Stock footage with text overlays",
    a_roll: [
      "Elderly woman at kitchen table (5s)",
      "Close-up of family photos (3s)",
    ],
    b_roll: [
      "Funeral flowers (2s)",
      "Bills on a table (2s)",
    ],
    scene_breakdown: [
      { sceneNumber: 1, sceneType: "A-roll", lineReference: "Hook", setting: "Kitchen table", emotion: "Worried", imagePrompt: "", klingPrompt: "" },
      { sceneNumber: 2, sceneType: "B-roll", lineReference: "Problem", setting: "Bills on table", emotion: "Anxious", imagePrompt: "", klingPrompt: "" },
      { sceneNumber: 3, sceneType: "A-roll", lineReference: "Solution", setting: "Phone call", emotion: "Hopeful", imagePrompt: "", klingPrompt: "" },
      { sceneNumber: 4, sceneType: "A-roll", lineReference: "CTA", setting: "Phone number on screen", emotion: "Reassured", imagePrompt: "", klingPrompt: "" },
    ],
    created_at: "2025-12-05T00:00:00Z",
  },
];

type MockStore = { _mockVisualPlanRows?: VisualPlanRow[] };
const g = globalThis as typeof globalThis & MockStore;
if (!g._mockVisualPlanRows) g._mockVisualPlanRows = [...DEFAULT_VISUAL_PLANS];
export const mockVisualPlanRows = g._mockVisualPlanRows;
