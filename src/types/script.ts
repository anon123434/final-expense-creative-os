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

export interface HookVariant {
  hook: string;
  hookType: string;        // e.g. "Shock Revelation", "Deadline Panic"
  emotionalCore: string;   // one sentence describing the psychological engine
  triggers: string[];      // e.g. ["curiosity", "social proof", "financial relief"]
  visualMoments: string[]; // 3 attention-grabbing b-roll ideas specific to this hook
}
