// ── DB-backed image prompt row ─────────────────────────────────────────────
// Stored as individual rows in the prompts table, one per scene × prompt_type.

export interface ImagePrompt {
  id: string;
  campaignId: string;
  visualPlanId: string;
  sceneName: string | null;
  promptType: string | null;
  promptText: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ── prompt_type constants ──────────────────────────────────────────────────
// Each scene row gets one of these types.
// Adding a new AI tool = adding a new type here.

export type PromptType =
  | "image"          // Seedream / NanoBanana still image
  | "kling"          // Kling 3.0 image-to-video motion prompt
  | "vo_script"      // ElevenLabs full tagged voiceover (scene_name: "vo_script")
  | "higgsfield"     // Future: Higgsfield enhancement
  | "veo"            // Future: Google Veo
  | "sora";          // Future: OpenAI Sora

// ── Scene prompt (domain type) ─────────────────────────────────────────────
// One scene in a prompt pack — contains all prompt types for that scene.

export interface ScenePrompt {
  sceneNumber: number;
  lineReference: string;
  sceneType: "A-roll" | "B-roll";
  setting: string;
  emotion: string;
  imagePrompt: string;    // Seedream / NanoBanana
  klingPrompt: string;    // Kling 3.0 image-to-video
  // Extend with future tool prompts:
  // higgsfieldPrompt?: string;
  // veoPrompt?: string;
}

// ── Scene prompt pack (domain type) ───────────────────────────────────────
// Full production prompt pack for one script + visual plan.

export interface ScenePromptPack {
  visualPlanId: string;
  scenes: ScenePrompt[];
  voScript: string;   // ElevenLabs full tagged script
}
