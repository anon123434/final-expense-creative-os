export interface CreativeVariation {
  id: string;
  campaignId: string;
  variationNumber: number;
  title: string;
  hook: string;
  oneSentenceAngle: string;
  emotionalTone: string;
  whatChanged: string[];
  triggerStack: Record<string, boolean>;
  sceneSummary: string[];
  imagePromptExamples: string[];
  klingPromptExamples: string[];
  createdAt: string;
}
