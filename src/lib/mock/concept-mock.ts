import type { ConceptRow } from "@/types/database";

const DEFAULT_CONCEPTS: ConceptRow[] = [
  {
    id: "concept-1",
    campaign_id: "camp-1",
    title: "Don't Leave Your Family with the Burden",
    one_sentence_angle: "Fear of financial burden on loved ones drives action.",
    hook: "What happens to your family when you're gone?",
    emotional_setup: "When my husband passed, the bills didn't stop coming. Funeral, hospital, everything — it nearly broke us.",
    conflict: "The average funeral costs over $8,000. Most families have nothing set aside for it.",
    solution: "For less than a dollar a day, I got a plan that covers everything. No health questions. No waiting.",
    payoff: "One phone call changed everything. My kids don't have to worry about that anymore.",
    cta: "Call now to get your free information kit.",
    trigger_map: { loss_aversion: true, guilt_avoidance: true, affordability: true },
    visual_world: "Warm kitchen, soft lighting, family photos on the wall",
    llm_raw: null,
    is_selected: true,
    created_at: "2025-12-02T00:00:00Z",
  },
  {
    id: "concept-2",
    campaign_id: "camp-1",
    title: "The Promise She Kept",
    one_sentence_angle: "A grandmother keeps her promise to never be a burden.",
    hook: "I promised my kids I'd never leave them with my debt. I just didn't know how to keep that promise — until now.",
    emotional_setup: "I've been putting it off for years. I didn't want to think about it.",
    conflict: "But my daughter sat me down and said, Mom, what happens to us if something happens to you?",
    solution: "I answered two questions on the phone and got approved the same day. No medical exam. No waiting period.",
    payoff: "My family will remember my love — not my bills.",
    cta: "Call the number on your screen right now.",
    trigger_map: { guilt_avoidance: true, simplicity: true, legitimacy: true },
    visual_world: "Cozy living room, family gathering, golden hour lighting",
    llm_raw: null,
    is_selected: false,
    created_at: "2025-12-02T00:00:00Z",
  },
];

type MockStore = { _mockConceptRows?: ConceptRow[] };
const g = globalThis as typeof globalThis & MockStore;
if (!g._mockConceptRows) g._mockConceptRows = [...DEFAULT_CONCEPTS];
export const mockConceptRows = g._mockConceptRows;
