import type { VisualPlanRow } from "@/types/database";

export const mockVisualPlanRows: VisualPlanRow[] = [
  {
    id: "vp-1",
    campaign_id: "camp-1",
    script_id: "script-1",
    overall_direction: "Warm, emotional, kitchen-table feel. Golden hour lighting throughout.",
    base_layer: "Stock footage with text overlays",
    a_roll: [
      { description: "Elderly woman at kitchen table", duration: "5s" },
      { description: "Close-up of family photos", duration: "3s" },
    ],
    b_roll: [
      { description: "Funeral flowers", duration: "2s" },
      { description: "Bills on a table", duration: "2s" },
    ],
    scene_breakdown: [
      { scene: 1, description: "Hook — woman looks worried", duration: "5s", transition: "Fade in" },
      { scene: 2, description: "Problem — bills pile up", duration: "8s", transition: "Cut" },
      { scene: 3, description: "Solution — phone call", duration: "10s", transition: "Cut" },
      { scene: 4, description: "CTA — number on screen", duration: "7s", transition: "Fade to black" },
    ],
    created_at: "2025-12-05T00:00:00Z",
  },
];
