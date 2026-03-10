/**
 * Shared cinematic style guide for image and motion prompts.
 *
 * Applied consistently across:
 *   - visual-plan-generator  (scene breakdown)
 *   - scene-prompt-generator (refined prompt pack)
 *   - variation-generator    (variation examples)
 *
 * ── Image pillars ──────────────────────────────────────────────────────────
 *   documentary realism · 50mm lens look · natural available lighting ·
 *   modest middle-class environments · authentic emotions ·
 *   no exaggerated acting · grounded realism
 *
 * ── Kling motion pillars ───────────────────────────────────────────────────
 *   subtle natural movement · stabilized camera ·
 *   slow push-ins or slow pans only · realistic physical motion ·
 *   no fast camera shake · cinematic documentary realism
 */

// ── Image ──────────────────────────────────────────────────────────────────

const IMAGE_BASE =
  "Cinematic documentary photography. 50mm lens look. Natural available light.";

const IMAGE_ENVIRONMENT =
  "Modest middle-class environment. Grounded, realistic setting.";

const IMAGE_PERFORMANCE =
  "Authentic, unposed expression. No exaggerated acting. Real emotional truth.";

const IMAGE_TECHNICAL =
  "No text overlays. No watermarks. No graphics. 16:9 aspect ratio.";

/**
 * Builds a production-ready image prompt from a scene description.
 *
 * @param sceneDescription  What is in the frame — subject, setting, light source.
 * @param isARoll           When true, adds direct-to-camera natural eye contact note.
 */
export function buildImagePrompt(
  sceneDescription: string,
  isARoll = false
): string {
  const performance = isARoll
    ? "Natural, direct eye contact with camera. Authentic, unposed expression."
    : IMAGE_PERFORMANCE;

  return [
    IMAGE_BASE,
    sceneDescription.trim().replace(/\.+$/, "") + ".",
    IMAGE_ENVIRONMENT,
    performance,
    IMAGE_TECHNICAL,
  ].join(" ");
}

// ── Reusable performance patterns ──────────────────────────────────────────

/**
 * Phone Listening Beat — B-roll performance direction.
 *
 * Apply automatically when a scene shows the avatar (or spokesperson) on the
 * phone and the other party is speaking. Covers the full listening arc:
 * attentive silence → understanding → quiet agreement → subtle relief.
 */
export const PHONE_LISTENING_BEAT = {
  /**
   * Image still: captures the attentive listening moment mid-beat.
   * Append to sceneDescription before passing to buildImagePrompt().
   */
  imageDirection:
    "Avatar on phone, listening attentively. Phone held naturally to ear. " +
    "Expression: quiet focus, slight attentive lean, eyes soft and present. " +
    "No speaking — mid-listen. Subtle suggestion of relief beginning to show.",

  /**
   * Kling motion: full arc from listening → agreement → relief.
   * Use as the motionDescription in buildKlingPrompt().
   */
  klingMotion:
    "Avatar listens in silence as the other person speaks. " +
    "Performance arc: attentive stillness → one or two small slow nods → " +
    "tiny natural facial reactions showing understanding → quiet agreement. " +
    "Near the end: expression softens noticeably — a subtle exhale, " +
    "slight shoulder release, or small relaxing gesture signals relief. " +
    "All movement minimal and involuntary-feeling. Very slow push-in on face.",
} as const;

/**
 * Detects whether a scene description likely involves a phone listening beat.
 * Used by generators to auto-apply PHONE_LISTENING_BEAT.
 */
export function isPhoneListeningScene(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes("phone") || lower.includes("call") || lower.includes("calling")) &&
    (lower.includes("listen") || lower.includes("relief") || lower.includes("agent") ||
     lower.includes("speaking") || lower.includes("hears") || lower.includes("answer"))
  );
}

// ── Kling ──────────────────────────────────────────────────────────────────

const KLING_RULES = [
  "Cinematic documentary image-to-video.",
  "Stabilized camera — no handheld shake.",
  "Subtle natural movement only — no exaggerated or fast motion.",
  "Camera movement limited to very slow push-in or very slow pan.",
  "Realistic physical motion and natural timing.",
  "Natural available lighting throughout — no artificial flicker.",
  "50mm lens realism.",
  "No sudden cuts or jarring transitions.",
].join(" ");

/**
 * Builds a production-ready Kling motion prompt from a motion description.
 *
 * @param motionDescription  What moves, how it moves, what the subject does.
 */
export function buildKlingPrompt(motionDescription: string): string {
  return KLING_RULES + " " + motionDescription.trim();
}
