/**
 * Shared result types for server actions.
 *
 * All server actions return a discriminated union so callers can
 * do a simple `if (result.success)` check without try/catch.
 *
 * Usage — named data field (preferred for clarity at call sites):
 *
 *   export async function myAction(): Promise<{ success: true; script: Script } | FailResult> {
 *     try {
 *       return { success: true, script };
 *     } catch (err) {
 *       return actionFail(err);
 *     }
 *   }
 *
 * Usage — generic data field (use when the caller doesn't need a named key):
 *
 *   export async function myAction(): Promise<ActionResult<MyData>> {
 *     try {
 *       return actionOk(data);
 *     } catch (err) {
 *       return actionFail(err);
 *     }
 *   }
 */

// ── Core types ─────────────────────────────────────────────────────────────

/** The failure branch shared by all action return types. */
export type FailResult = { success: false; error: string };

/** Generic action result — use when a named data field isn't required. */
export type ActionResult<T> = { success: true; data: T } | FailResult;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Construct a success result with a generic `data` field. */
export function actionOk<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

/**
 * Construct a failure result from an unknown caught error.
 * Extracts the message when the value is an `Error` instance,
 * otherwise falls back to the provided fallback string.
 */
export function actionFail(
  err: unknown,
  fallback = "An unexpected error occurred."
): FailResult {
  const message = err instanceof Error ? err.message : fallback;
  return { success: false, error: message };
}
