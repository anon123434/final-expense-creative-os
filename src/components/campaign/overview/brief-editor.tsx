"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateCampaignAction } from "@/app/actions/campaign";
import { personas } from "@/lib/seed/personas";
import { archetypes } from "@/lib/seed/archetypes";
import { tones } from "@/lib/seed/tones";
import type { Campaign } from "@/types";

interface BriefEditorProps {
  campaign: Campaign;
}

interface FormState {
  title: string;
  offerName: string;
  personaId: string;
  archetypeId: string;
  emotionalTone: string;
  durationSeconds: string;
  phoneNumber: string;
  phoneNumberPhonetic: string;
  deadlineText: string;
  benefitAmount: string;
  affordabilityText: string;
  ctaStyle: string;
  notes: string;
}

export function CampaignBriefEditor({ campaign }: BriefEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>({
    title: campaign.title,
    offerName: campaign.offerName ?? "",
    personaId: campaign.personaId ?? "",
    archetypeId: campaign.archetypeId ?? "",
    emotionalTone: campaign.emotionalTone ?? "",
    durationSeconds: campaign.durationSeconds ? String(campaign.durationSeconds) : "",
    phoneNumber: campaign.phoneNumber ?? "",
    phoneNumberPhonetic: campaign.phoneNumberPhonetic ?? "",
    deadlineText: campaign.deadlineText ?? "",
    benefitAmount: campaign.benefitAmount ?? "",
    affordabilityText: campaign.affordabilityText ?? "",
    ctaStyle: campaign.ctaStyle ?? "",
    notes: campaign.notes ?? "",
  });

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancel() {
    setForm({
      title: campaign.title,
      offerName: campaign.offerName ?? "",
      personaId: campaign.personaId ?? "",
      archetypeId: campaign.archetypeId ?? "",
      emotionalTone: campaign.emotionalTone ?? "",
      durationSeconds: campaign.durationSeconds ? String(campaign.durationSeconds) : "",
      phoneNumber: campaign.phoneNumber ?? "",
      phoneNumberPhonetic: campaign.phoneNumberPhonetic ?? "",
      deadlineText: campaign.deadlineText ?? "",
      benefitAmount: campaign.benefitAmount ?? "",
      affordabilityText: campaign.affordabilityText ?? "",
      ctaStyle: campaign.ctaStyle ?? "",
      notes: campaign.notes ?? "",
    });
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateCampaignAction(campaign.id, {
        title: form.title || campaign.title,
        offerName: form.offerName || undefined,
        personaId: form.personaId || undefined,
        archetypeId: form.archetypeId || undefined,
        emotionalTone: form.emotionalTone || undefined,
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : undefined,
        phoneNumber: form.phoneNumber || undefined,
        phoneNumberPhonetic: form.phoneNumberPhonetic || undefined,
        deadlineText: form.deadlineText || undefined,
        benefitAmount: form.benefitAmount || undefined,
        affordabilityText: form.affordabilityText || undefined,
        ctaStyle: form.ctaStyle || undefined,
        notes: form.notes || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="pt-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/5" />
        <p className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">
          Campaign Brief
        </p>
        <div className="h-px flex-1 bg-white/5" />
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white/8 hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center gap-1 rounded-md border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white/8 transition-colors disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 rounded-md border border-[#00E676]/30 bg-[#00E676]/10 px-2.5 py-1 text-[11px] text-[#00E676] hover:bg-[#00E676]/20 transition-colors disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-3 text-xs text-destructive">{error}</p>
      )}

      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Title — full width */}
          <div className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 sm:col-span-2">
            <p className="mb-2 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">Campaign Title</p>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputCls}
              placeholder="Campaign title"
            />
          </div>

          {/* Creative */}
          <div className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 space-y-3">
            <p className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">Creative</p>
            <Field label="Offer">
              <input value={form.offerName} onChange={(e) => set("offerName", e.target.value)} className={inputCls} placeholder="e.g. Final Expense Insurance" />
            </Field>
            <Field label="Persona">
              <select value={form.personaId} onChange={(e) => set("personaId", e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                {personas.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Archetype">
              <select value={form.archetypeId} onChange={(e) => set("archetypeId", e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                {archetypes.map((a) => (
                  <option key={a.key} value={a.key}>{a.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Tone">
              <select value={form.emotionalTone} onChange={(e) => set("emotionalTone", e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                {tones.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Duration">
              <select value={form.durationSeconds} onChange={(e) => set("durationSeconds", e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                <option value="15">15s</option>
                <option value="30">30s</option>
                <option value="60">60s</option>
                <option value="90">90s</option>
                <option value="120">120s</option>
              </select>
            </Field>
          </div>

          {/* Production */}
          <div className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 space-y-3">
            <p className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">Production</p>
            <Field label="Phone">
              <input value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} className={inputCls} placeholder="1-800-555-0100" />
            </Field>
            <Field label="Phonetic">
              <input value={form.phoneNumberPhonetic} onChange={(e) => set("phoneNumberPhonetic", e.target.value)} className={inputCls} placeholder="one eight hundred..." />
            </Field>
            <Field label="Deadline">
              <input value={form.deadlineText} onChange={(e) => set("deadlineText", e.target.value)} className={inputCls} placeholder="e.g. before Friday" />
            </Field>
            <Field label="Benefit">
              <input value={form.benefitAmount} onChange={(e) => set("benefitAmount", e.target.value)} className={inputCls} placeholder="e.g. $25,000" />
            </Field>
            <Field label="Affordability">
              <input value={form.affordabilityText} onChange={(e) => set("affordabilityText", e.target.value)} className={inputCls} placeholder="e.g. $2/day" />
            </Field>
            <Field label="CTA Style">
              <input value={form.ctaStyle} onChange={(e) => set("ctaStyle", e.target.value)} className={inputCls} placeholder="e.g. Call now" />
            </Field>
          </div>

          {/* Notes — full width */}
          <div className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 sm:col-span-2">
            <p className="mb-2 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">Notes</p>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className={cn(inputCls, "resize-none")}
              placeholder="Additional campaign notes…"
            />
          </div>
        </div>
      ) : (
        <BriefReadView campaign={campaign} />
      )}
    </div>
  );
}

// ── Read-only view (extracted so it's reusable) ───────────────────────────

import { getPersonaByKey } from "@/lib/seed/personas";
import { getArchetypeByKey } from "@/lib/seed/archetypes";
import { getToneByKey } from "@/lib/seed/tones";

function BriefReadView({ campaign }: { campaign: Campaign }) {
  const persona = campaign.personaId ? getPersonaByKey(campaign.personaId) : null;
  const archetype = campaign.archetypeId ? getArchetypeByKey(campaign.archetypeId) : null;
  const tone = campaign.emotionalTone ? getToneByKey(campaign.emotionalTone) : null;

  const hasCreative = persona || archetype || tone || campaign.durationSeconds || campaign.offerName;
  const hasProduction = campaign.phoneNumber || campaign.deadlineText || campaign.benefitAmount || campaign.affordabilityText || campaign.ctaStyle;

  if (!hasCreative && !hasProduction && !campaign.notes) {
    return (
      <p className="text-sm text-muted-foreground/50 italic">No brief details yet. Click Edit to add.</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {hasCreative && (
        <div className="rounded-xl border border-white/6 bg-[#0d0d0d] px-4 py-3">
          <p className="mb-2.5 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">Creative</p>
          <div className="space-y-1.5">
            {campaign.offerName && <BriefRow label="Offer" value={campaign.offerName} />}
            {persona && <BriefRow label="Persona" value={persona.label} />}
            {archetype && <BriefRow label="Archetype" value={archetype.label} />}
            {tone && <BriefRow label="Tone" value={tone.label} />}
            {campaign.durationSeconds && <BriefRow label="Duration" value={`${campaign.durationSeconds}s`} />}
          </div>
        </div>
      )}
      {hasProduction && (
        <div className="rounded-xl border border-white/6 bg-[#0d0d0d] px-4 py-3">
          <p className="mb-2.5 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">Production</p>
          <div className="space-y-1.5">
            {campaign.phoneNumber && <BriefRow label="Phone" value={campaign.phoneNumber} />}
            {campaign.deadlineText && <BriefRow label="Deadline" value={campaign.deadlineText} />}
            {campaign.benefitAmount && <BriefRow label="Benefit" value={campaign.benefitAmount} />}
            {campaign.affordabilityText && <BriefRow label="Affordability" value={campaign.affordabilityText} />}
            {campaign.ctaStyle && <BriefRow label="CTA" value={campaign.ctaStyle} />}
          </div>
        </div>
      )}
      {campaign.notes && (
        <div className="rounded-xl border border-white/6 bg-[#0d0d0d] px-4 py-3 sm:col-span-2">
          <p className="mb-2 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">Notes</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{campaign.notes}</p>
        </div>
      )}
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-20 shrink-0 font-mono-data text-[9px] uppercase tracking-wider text-muted-foreground/50">{label}</span>
      <span className="text-[13px] text-foreground/75">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 font-mono-data text-[9px] uppercase tracking-wider text-muted-foreground/50">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-white/8 bg-white/4 px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-[#00E676]/40 focus:outline-none focus:ring-1 focus:ring-[#00E676]/20 transition-colors";
