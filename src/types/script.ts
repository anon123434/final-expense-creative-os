export interface Script {
  id: string;
  campaignId: string;
  conceptId: string;
  versionName: string | null;
  durationSeconds: number | null;
  fullScript: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
