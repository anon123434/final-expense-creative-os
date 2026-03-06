/** Domain type for UI — camelCase. Mapped from CampaignRow. */
export interface Campaign {
  id: string;
  userId: string;
  title: string;
  offerName: string | null;
  personaId: string | null;
  archetypeId: string | null;
  emotionalTone: string | null;
  durationSeconds: number | null;
  phoneNumber: string | null;
  phoneNumberPhonetic: string | null;
  deadlineText: string | null;
  benefitAmount: string | null;
  affordabilityText: string | null;
  ctaStyle: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFormData {
  title: string;
  offerName?: string;
  personaId?: string;
  archetypeId?: string;
  emotionalTone?: string;
  durationSeconds?: number;
  phoneNumber?: string;
  phoneNumberPhonetic?: string;
  deadlineText?: string;
  benefitAmount?: string;
  affordabilityText?: string;
  ctaStyle?: string;
  notes?: string;
}

export interface CampaignTrigger {
  id: string;
  campaignId: string;
  triggerKey: string;
  included: boolean;
}
