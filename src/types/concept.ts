export interface AdConcept {
  id: string;
  campaignId: string;
  title: string;
  oneSentenceAngle: string | null;
  hook: string | null;
  emotionalSetup: string | null;
  conflict: string | null;
  solution: string | null;
  payoff: string | null;
  cta: string | null;
  triggerMap: Record<string, unknown> | null;
  visualWorld: string | null;
  llmRaw: Record<string, unknown> | null;
  isSelected: boolean;
  createdAt: string;
}
