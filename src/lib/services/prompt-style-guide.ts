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

/**
 * Check Holding Beat — B-roll performance direction.
 *
 * Apply automatically when a scene shows the avatar holding a check
 * (benefit payment, settlement, etc.). Covers the full emotional arc:
 * quiet disbelief → acceptance → subtle relief.
 */
export const CHECK_HOLDING_BEAT = {
  /**
   * Image still: captures the avatar in profile holding the check at reading distance.
   * Append to sceneDescription before passing to buildImagePrompt().
   */
  imageDirection:
    "Over-the-shoulder shot from behind, camera positioned behind and slightly to the side of the avatar. " +
    "We see the back of the avatar's shoulder filling the near left frame edge — the avatar is in back-profile, NOT side profile. " +
    "The avatar holds a standard-sized paper check at natural arm distance, roughly at waist-to-chest height. " +
    "The check is a realistic size — a normal bank check proportional to the person's hands, occupying roughly 15–20% of the frame. NOT oversized. NOT poster-sized. A real check fits in two hands. " +
    "The check is slightly angled toward the camera so the amount is legible, but it does not dominate the frame. " +
    "The avatar's partial side profile (jaw, cheek) is visible at the edge of frame, expression showing quiet disbelief transitioning to acceptance. " +
    "Warm interior light. Medium shot.",

  /**
   * Kling motion: full arc from stunned stillness → exhale of relief.
   * Use as the motionDescription in buildKlingPrompt().
   */
  klingMotion:
    "Avatar looks down at the check. A slight pause — 1 to 2 seconds of absolute stillness. " +
    "Then a slow exhale through the nose, tiny smile forming or chin lowering in quiet relief. " +
    "One small slow nod of acceptance. No large gestures. " +
    "Very slow push-in toward the document.",
} as const;

/**
 * Detects whether a scene description likely involves a check holding beat.
 * Used by generators to auto-apply CHECK_HOLDING_BEAT.
 */
export function isCheckHoldingScene(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    // "check" paired with a holding/receiving/benefit context
    (lower.includes("check") && (lower.includes("hold") || lower.includes("holding") || lower.includes("receives") || lower.includes("handed") || lower.includes("benefit") || lower.includes("insurance") || lower.includes("payment"))) ||
    (lower.includes("benefit amount") && (lower.includes("hold") || lower.includes("receives") || lower.includes("check"))) ||
    // These compound phrases are unambiguous — self-sufficient signals
    lower.includes("payment check") || lower.includes("insurance check") || lower.includes("benefit check")
  );
}

/**
 * Approval Letter Beat — B-roll performance direction.
 *
 * Apply automatically when a scene shows the avatar holding or reading
 * an approval letter, coverage confirmation, or acceptance document.
 * Covers the full emotional arc: focused reading → still pause → quiet relief.
 */
export const APPROVAL_LETTER_BEAT = {
  /**
   * Image still: avatar in profile reading the letter at reading distance.
   * Append to sceneDescription before passing to buildImagePrompt().
   */
  imageDirection:
    "Avatar holds a standard letter-sized piece of paper at natural reading distance, shot from behind the avatar's shoulder. " +
    "Camera positioned behind and slightly to the side — only the avatar's partial side profile visible at the near frame edge. " +
    "The paper is proportional to the person — normal 8.5x11 sheet, NOT oversized. Paper occupies roughly 15–20% of the frame. " +
    "Expression: focused and still — mid-read, eyes tracking across the page. " +
    "Warm interior light. Medium shot.",

  /**
   * Kling motion: full arc from silent reading → pause → quiet acceptance.
   * Use as the motionDescription in buildKlingPrompt().
   */
  klingMotion:
    "Avatar reads the letter silently. Eyes track slowly across the page. " +
    "A small still pause — expression held. " +
    "Then expression softens — a quiet exhale or the shoulders drop very slightly. " +
    "One slow nod of acceptance. No large gestures. " +
    "Very slow push-in toward the document.",
} as const;

/**
 * Detects whether a scene description likely involves an approval letter beat.
 * Used by generators to auto-apply APPROVAL_LETTER_BEAT.
 */
export function isApprovalLetterScene(text: string): boolean {
  const lower = text.toLowerCase();
  const hasDocument = lower.includes("letter") || lower.includes("document") || lower.includes("paperwork");
  const hasCoverage = lower.includes("coverage") || lower.includes("insurance") || lower.includes("policy");
  return (
    // Compound phrases are unambiguous — self-sufficient signals
    lower.includes("coverage confirmed") ||
    lower.includes("policy approved") ||
    lower.includes("coverage letter") ||
    lower.includes("approval letter") ||
    lower.includes("acceptance letter") ||
    // "approved"/"accepted" require a document or coverage context to avoid false positives
    ((lower.includes("approved") || lower.includes("accepted")) && (hasDocument || hasCoverage)) ||
    // "letter" paired with coverage/insurance/policy context
    (lower.includes("letter") && hasCoverage)
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
