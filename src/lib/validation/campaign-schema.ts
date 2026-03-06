import { z } from "zod";

export const triggerStateSchema = z.enum(["include", "exclude", "neutral"]);
export type TriggerState = z.infer<typeof triggerStateSchema>;

export const campaignFormSchema = z.object({
  // ── Basics ──────────────────────────────────────────────
  title: z.string().min(1, "Campaign title is required"),
  offerName: z.string().optional(),

  // ── Creative Direction ───────────────────────────────────
  personaId: z.string().optional(),
  archetypeId: z.string().optional(),
  emotionalTone: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),

  // ── Production Details ───────────────────────────────────
  phoneNumber: z.string().optional(),
  deadlineText: z.string().optional(),
  benefitAmount: z.string().optional(),
  affordabilityText: z.string().optional(),
  ctaStyle: z.string().optional(),

  // ── Triggers ─────────────────────────────────────────────
  // Record<triggerKey, "include" | "exclude" | "neutral">
  triggers: z.record(z.string(), triggerStateSchema).optional(),

  // ── Notes ────────────────────────────────────────────────
  notes: z.string().optional(),
});

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;
