import type { CampaignRow, CampaignTriggerRow } from "@/types/database";

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

const DEFAULT_CAMPAIGNS: CampaignRow[] = [
  {
    id: "camp-1",
    user_id: MOCK_USER_ID,
    title: "Senior Peace of Mind",
    offer_name: "Final Expense Whole Life",
    persona_id: "widow",
    archetype_id: "promise_kept",
    emotional_tone: "heartfelt",
    duration_seconds: 30,
    phone_number: "1-800-555-0100",
    phone_number_phonetic: "one eight hundred five five five zero one hundred",
    deadline_text: "Call before midnight tonight",
    benefit_amount: "$10,000",
    affordability_text: "Less than $1 a day",
    cta_style: "call_now",
    notes: null,
    persona_image_url: null,
    avatar_id: null,
    created_at: "2025-12-01T00:00:00Z",
    updated_at: "2025-12-15T00:00:00Z",
  },
  {
    id: "camp-2",
    user_id: MOCK_USER_ID,
    title: "Legacy Protection",
    offer_name: "Guaranteed Issue Final Expense",
    persona_id: "daughter",
    archetype_id: "funeral_burden_avoided",
    emotional_tone: "urgent",
    duration_seconds: 60,
    phone_number: "1-800-555-0200",
    phone_number_phonetic: "one eight hundred five five five zero two hundred",
    deadline_text: null,
    benefit_amount: "$25,000",
    affordability_text: "Pennies a day",
    cta_style: "call_now",
    notes: null,
    persona_image_url: null,
    avatar_id: null,
    created_at: "2025-12-10T00:00:00Z",
    updated_at: "2025-12-10T00:00:00Z",
  },
  {
    id: "camp-3",
    user_id: MOCK_USER_ID,
    title: "Family First",
    offer_name: "Simplified Issue Life",
    persona_id: "grandson",
    archetype_id: "family_protected_after_death",
    emotional_tone: "loving",
    duration_seconds: 30,
    phone_number: "1-800-555-0300",
    phone_number_phonetic: "one eight hundred five five five zero three hundred",
    deadline_text: null,
    benefit_amount: "$15,000",
    affordability_text: null,
    cta_style: "call_now",
    notes: null,
    persona_image_url: null,
    avatar_id: null,
    created_at: "2025-11-01T00:00:00Z",
    updated_at: "2025-12-01T00:00:00Z",
  },
];

const DEFAULT_TRIGGERS: CampaignTriggerRow[] = [
  { id: "trig-1", campaign_id: "camp-1", trigger_key: "loss_aversion", included: true },
  { id: "trig-2", campaign_id: "camp-1", trigger_key: "guilt_avoidance", included: true },
  { id: "trig-3", campaign_id: "camp-1", trigger_key: "affordability", included: true },
  { id: "trig-4", campaign_id: "camp-2", trigger_key: "scarcity", included: true },
  { id: "trig-5", campaign_id: "camp-2", trigger_key: "urgency", included: true },
];

// ── Persist mock data on globalThis so it survives module re-evaluations ──
// Next.js dev mode can re-evaluate modules per request; globalThis persists
// for the lifetime of the Node process.
type MockStore = {
  _mockCampaignRows?: CampaignRow[];
  _mockCampaignTriggerRows?: CampaignTriggerRow[];
};

const g = globalThis as typeof globalThis & MockStore;

if (!g._mockCampaignRows) g._mockCampaignRows = [...DEFAULT_CAMPAIGNS];
if (!g._mockCampaignTriggerRows) g._mockCampaignTriggerRows = [...DEFAULT_TRIGGERS];

export const mockCampaignRows = g._mockCampaignRows;
export const mockCampaignTriggerRows = g._mockCampaignTriggerRows;
