"use client";

import { useRef, useState } from "react";
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
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
  { value: 90, label: "90s" },
];

export function CampaignForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [personaImagePreview, setPersonaImagePreview] = useState<string | null>(null);

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

  function handlePersonaImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPersonaImagePreview(dataUrl);
      setValue("personaImageUrl", dataUrl, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  }

  function clearPersonaImage() {
    setPersonaImagePreview(null);
    setValue("personaImageUrl", undefined, { shouldDirty: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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

        {/* ── Persona Image ───────────────────────────────────── */}
        <FormSection
          title="Persona Image"
          description="Optional — attach a reference photo for exact facial consistency in generated image prompts."
        >
          <div className="flex items-start gap-4">
            {personaImagePreview ? (
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={personaImagePreview}
                  alt="Persona reference"
                  className="h-24 w-24 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={clearPersonaImage}
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground text-xs text-center hover:border-primary hover:text-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload photo
              </div>
            )}
            <div className="flex flex-col gap-1.5 pt-1">
              <p className="text-sm text-muted-foreground">
                Use the attached image for exact facial consistency — this reference will be included automatically in image and scene prompts when generating content for this campaign.
              </p>
              {!personaImagePreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose image…
                </Button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePersonaImageChange}
          />
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
