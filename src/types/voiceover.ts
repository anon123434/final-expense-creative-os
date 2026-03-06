export interface VoiceoverScript {
  id: string;
  campaignId: string;
  scriptId: string;
  taggedScript: string | null;
  voiceProfile: string | null;
  deliveryNotes: string | null;
  createdAt: string;
}
