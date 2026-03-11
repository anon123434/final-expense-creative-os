/**
 * Pre-built cinematic cold open sequence that plays before the avatar speaks.
 * Scenes are hardcoded, not AI-generated.
 * buildImagePrompt / buildKlingPrompt are applied at merge time in visual-plan-generator.
 */
export interface CinematicScene {
  sceneLabel: string;      // UI label, e.g. "Church — whispering mourners"
  rawImagePrompt: string;  // Raw description — buildImagePrompt() wraps this
  rawKlingPrompt: string;  // Raw motion description — buildKlingPrompt() wraps this
  soundNote: string;       // Appended to klingPrompt: "Sound: <note>"
}

export interface CinematicHookStyle {
  id: string;              // Slug, e.g. "church-whispers"
  name: string;            // Display name, e.g. "Church Whispers"
  description: string;     // 1-2 sentence UI description
  hookType: string;        // e.g. "Social Tension", "Financial Shock"
  duration: number;        // Approximate duration in seconds
  scenes: CinematicScene[];
}
