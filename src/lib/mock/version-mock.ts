import type { CampaignVersionRow } from "@/types/database";

export const mockVersionRows: CampaignVersionRow[] = [
  {
    id: "ver-1",
    campaign_id: "camp-1",
    name: "Initial Draft",
    snapshot: { concepts: 2, scripts: 1, voiceovers: 1, visualPlans: 1, prompts: 1 },
    created_at: "2025-12-06T00:00:00Z",
  },
];
