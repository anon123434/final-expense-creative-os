"use client";

import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, inputClass, selectClass, textareaClass } from "@/components/ui/form-field";
import { TriggerSelector } from "@/components/campaign/trigger-selector";
import { campaignFormSchema, type CampaignFormValues } from "@/lib/validation/campaign-schema";
import { createCampaignAction } from "@/app/actions/campaign";
import { personas } from "@/lib/seed/personas";
import { archetypes } from "@/lib/seed/archetypes";
import { tones } from "@/lib/seed/tones";

const CTA_STYLES = [
  { value: "call_now", label: "Call Now" },
  { value: "visit_site", label: "Visit Site" },
  { value: "text_us", label: "Text Us" },
];

const DURATION_OPTIONS = [
  { value: 30, label: "30 seconds" },
  { value: 45, label: "45 seconds" },
  { value: 60, label: "60 seconds" },
];

export function CampaignForm() {
  const router = useRouter();

  const methods = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      title: "",
      offerName: "",
      personaId: "",
      archetypeId: "",
      emotionalTone: "",
      durationSeconds: 30,
      phoneNumber: "",
      deadlineText: "",
      benefitAmount: "",
      affordabilityText: "",
      ctaStyle: "call_now",
      notes: "",
      triggers: {},
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = methods;

  const selectedPersonaId = watch("personaId");

  // Filter archetypes to those that support the selected persona, or show all
  const filteredArchetypes =
    selectedPersonaId
      ? archetypes.filter(
          (a) => a.bestPersonas.includes(selectedPersonaId) || true
        )
      : archetypes;

  async function onSubmit(values: CampaignFormValues) {
    const result = await createCampaignAction(values);
    if (result.success) {
      router.push(`/campaigns/${result.campaignId}`);
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Basics ─────────────────────────────────────────── */}
        <FormSection
          title="Basics"
          description="Core campaign identity — used as the label everywhere in the app."
        >
          <div className="grid gap-4">
            <FormField
              label="Campaign Title"
              htmlFor="title"
              required
              error={errors.title?.message}
            >
              <input
                id="title"
                className={cn(inputClass, errors.title && "border-destructive")}
                placeholder="e.g., Senior Peace of Mind"
                {...register("title")}
              />
            </FormField>

            <FormField label="Offer Name" htmlFor="offerName">
              <input
                id="offerName"
                className={inputClass}
                placeholder="e.g., Final Expense Whole Life"
                {...register("offerName")}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ── Creative Direction ──────────────────────────────── */}
        <FormSection
          title="Creative Direction"
          description="Sets the narrative strategy — used to guide concept and script generation."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Persona" htmlFor="personaId">
              <select id="personaId" className={selectClass} {...register("personaId")}>
                <option value="">— Select persona —</option>
                {personas.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Archetype" htmlFor="archetypeId">
              <select id="archetypeId" className={selectClass} {...register("archetypeId")}>
                <option value="">— Select archetype —</option>
                {filteredArchetypes.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Emotional Tone" htmlFor="emotionalTone">
              <select id="emotionalTone" className={selectClass} {...register("emotionalTone")}>
                <option value="">— Select tone —</option>
                {tones.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Duration Target" htmlFor="durationSeconds">
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((opt) => {
                  const current = watch("durationSeconds");
                  const isSelected = current === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue("durationSeconds", opt.value, { shouldDirty: true })}
                      className={cn(
                        "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-foreground hover:bg-accent"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </div>
        </FormSection>

        {/* ── Production Details ──────────────────────────────── */}
        <FormSection
          title="Production Details"
          description="The specific ad copy details inserted directly into scripts and voiceovers."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Phone Number"
              htmlFor="phoneNumber"
              hint="Displayed on screen — e.g., 1-800-555-0100"
            >
              <input
                id="phoneNumber"
                className={inputClass}
                placeholder="1-800-555-0100"
                {...register("phoneNumber")}
              />
            </FormField>

            <FormField label="CTA Style" htmlFor="ctaStyle">
              <select id="ctaStyle" className={selectClass} {...register("ctaStyle")}>
                {CTA_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Deadline Text"
              htmlFor="deadlineText"
              hint="e.g., Call before midnight tonight"
            >
              <input
                id="deadlineText"
                className={inputClass}
                placeholder="Call before midnight tonight"
                {...register("deadlineText")}
              />
            </FormField>

            <FormField
              label="Benefit Amount"
              htmlFor="benefitAmount"
              hint="e.g., $10,000 or up to $35,000"
            >
              <input
                id="benefitAmount"
                className={inputClass}
                placeholder="$10,000"
                {...register("benefitAmount")}
              />
            </FormField>

            <FormField
              label="Affordability Anchor"
              htmlFor="affordabilityText"
              hint="e.g., Less than $1 a day"
              className="sm:col-span-2"
            >
              <input
                id="affordabilityText"
                className={inputClass}
                placeholder="Less than $1 a day"
                {...register("affordabilityText")}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ── Triggers ───────────────────────────────────────── */}
        <FormSection
          title="Psychological Triggers"
          description="Click to cycle: neutral → include (green) → exclude (red). Included triggers guide generation; excluded ones are avoided."
        >
          <TriggerSelector />
        </FormSection>

        {/* ── Notes ──────────────────────────────────────────── */}
        <FormSection title="Notes" description="Internal notes — not used in generation.">
          <textarea
            className={textareaClass}
            placeholder="Any additional context, client preferences, or reminders..."
            {...register("notes")}
          />
        </FormSection>

        {/* ── Submit ─────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Campaign"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
