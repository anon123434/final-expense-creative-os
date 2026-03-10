import { notFound } from "next/navigation";
import { getCampaignById, getTriggersByCampaign } from "@/lib/repositories/campaign-repo";
import { getAvatarById } from "@/lib/repositories/avatar-repo";
import { getConceptsByCampaign } from "@/lib/repositories/concept-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getVoScriptsByCampaign } from "@/lib/repositories/voiceover-repo";
import { getVisualPlansByCampaign } from "@/lib/repositories/visual-plan-repo";
import { getPromptsByCampaign } from "@/lib/repositories/prompt-repo";
import { getVersionsByCampaign } from "@/lib/repositories/version-repo";
import { getVariationsByCampaign } from "@/lib/repositories/variation-repo";
import { getPersonaByKey } from "@/lib/seed/personas";
import { getArchetypeByKey } from "@/lib/seed/archetypes";
import { getToneByKey } from "@/lib/seed/tones";
import { getTriggerByKey } from "@/lib/seed/triggers";
import { AvatarHero } from "@/components/campaign/overview/avatar-hero";
import { PrintOverviewButton } from "@/components/campaign/overview/print-button";
import { PipelineGrid } from "@/components/campaign/overview/pipeline-grid";
import type { PipelineStage } from "@/components/campaign/overview/pipeline-grid";
import { Check, X } from "lucide-react";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

function stageStatus(
  done: boolean,
  prevDone: boolean,
): "completed" | "active" | "locked" {
  if (done) return "completed";
  if (prevDone) return "active";
  return "locked";
}

export default async function OverviewTab({ params }: OverviewPageProps) {
  const { id } = await params;

  const [
    campaign,
    triggers,
    concepts,
    scripts,
    voScripts,
    visualPlans,
    prompts,
    versions,
    variations,
  ] = await Promise.all([
    getCampaignById(id),
    getTriggersByCampaign(id),
    getConceptsByCampaign(id),
    getScriptsByCampaign(id),
    getVoScriptsByCampaign(id),
    getVisualPlansByCampaign(id),
    getPromptsByCampaign(id),
    getVersionsByCampaign(id),
    getVariationsByCampaign(id),
  ]);

  if (!campaign) notFound();

  const avatar = campaign.avatarId ? await getAvatarById(campaign.avatarId) : null;
  const persona = campaign.personaId ? getPersonaByKey(campaign.personaId) : null;
  const archetype = campaign.archetypeId ? getArchetypeByKey(campaign.archetypeId) : null;
  const tone = campaign.emotionalTone ? getToneByKey(campaign.emotionalTone) : null;

  const includedTriggers = triggers
    .filter((t) => t.included)
    .map((t) => getTriggerByKey(t.triggerKey)?.label ?? t.triggerKey);
  const excludedTriggers = triggers
    .filter((t) => !t.included)
    .map((t) => getTriggerByKey(t.triggerKey)?.label ?? t.triggerKey);

  // Stage completion flags
  const hasAvatar = !!campaign.avatarId;
  const hasConcepts = concepts.length > 0;
  const hasScript = scripts.length > 0;
  const hasVoiceover = voScripts.length > 0;
  const hasVisualPlan = visualPlans.length > 0;
  const hasPrompts = prompts.length > 0;
  const hasVersions = versions.length > 0;
  const hasVariations = variations.length > 0;

  const stages: PipelineStage[] = [
    {
      id: "avatar",
      title: "Avatar",
      description: "Generate your spokesperson",
      iconName: "UserCircle",
      status: stageStatus(hasAvatar, true),
      href: "/avatars",
    },
    {
      id: "concepts",
      title: "Concepts",
      description: "Develop creative concepts",
      iconName: "Lightbulb",
      status: stageStatus(hasConcepts, hasAvatar),
      href: `/campaigns/${id}/concepts`,
    },
    {
      id: "script",
      title: "Script",
      description: "Write and finalize script",
      iconName: "FileText",
      status: stageStatus(hasScript, hasConcepts),
      href: `/campaigns/${id}/script`,
    },
    {
      id: "elevenlabs",
      title: "ElevenLabs",
      description: "Generate AI voiceover",
      iconName: "Mic",
      status: stageStatus(hasVoiceover, hasScript),
      href: `/campaigns/${id}/elevenlabs`,
    },
    {
      id: "visual-plan",
      title: "Visual Plan",
      description: "Plan scenes and shots",
      iconName: "Film",
      status: stageStatus(hasVisualPlan, hasVoiceover),
      href: `/campaigns/${id}/visual-plan`,
    },
    {
      id: "prompts",
      title: "Prompts",
      description: "Generate image prompts",
      iconName: "Sparkles",
      status: stageStatus(hasPrompts, hasVisualPlan),
      href: `/campaigns/${id}/prompts`,
    },
    {
      id: "versions",
      title: "Versions",
      description: "Manage campaign versions",
      iconName: "GitBranch",
      status: stageStatus(hasVersions, hasPrompts),
      href: `/campaigns/${id}/versions`,
    },
    {
      id: "creative-lab",
      title: "Creative Lab",
      description: "Render final creative assets",
      iconName: "Clapperboard",
      status: stageStatus(hasVariations, hasVersions),
      href: `/campaigns/${id}/creative-lab`,
    },
  ];

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const selectedConcept = concepts.find((c) => c.isSelected) ?? null;
  const latestScript = scripts[0] ?? null;

  // Strip [emotion tags], [directions], and similar bracketed annotations from script text
  function cleanScript(text: string | null): string {
    if (!text) return "";
    return text.replace(/\[[^\]]*\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  const printScript = latestScript
    ? cleanScript(
        [latestScript.hook, latestScript.body, latestScript.cta].filter(Boolean).join("\n\n") ||
          latestScript.fullScript,
      )
    : null;

  const hasBriefContent =
    persona ||
    archetype ||
    tone ||
    campaign.durationSeconds ||
    campaign.offerName ||
    campaign.phoneNumber ||
    campaign.deadlineText ||
    campaign.benefitAmount ||
    campaign.affordabilityText ||
    campaign.ctaStyle ||
    campaign.notes ||
    triggers.length > 0;

  return (
    <>
      {/* ── SCREEN VIEW (hidden on print) ── */}
      <div className="screen-only space-y-6">
        <div className="flex justify-end">
          <PrintOverviewButton />
        </div>

        <AvatarHero
          avatar={avatar}
          campaignId={id}
          completedCount={completedCount}
          totalStages={stages.length}
        />

        <PipelineGrid stages={stages} />

        {hasBriefContent && (
          <div className="pt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <p className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">
                Campaign Brief
              </p>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(persona || archetype || tone || campaign.durationSeconds || campaign.offerName) && (
                <BriefCard label="Creative">
                  {campaign.offerName && <BriefRow label="Offer" value={campaign.offerName} />}
                  {persona && <BriefRow label="Persona" value={persona.label} />}
                  {archetype && <BriefRow label="Archetype" value={archetype.label} />}
                  {tone && <BriefRow label="Tone" value={tone.label} />}
                  {campaign.durationSeconds && (
                    <BriefRow label="Duration" value={`${campaign.durationSeconds}s`} />
                  )}
                </BriefCard>
              )}
              {(campaign.phoneNumber || campaign.deadlineText || campaign.benefitAmount || campaign.affordabilityText || campaign.ctaStyle) && (
                <BriefCard label="Production">
                  {campaign.phoneNumber && <BriefRow label="Phone" value={campaign.phoneNumber} />}
                  {campaign.deadlineText && <BriefRow label="Deadline" value={campaign.deadlineText} />}
                  {campaign.benefitAmount && <BriefRow label="Benefit" value={campaign.benefitAmount} />}
                  {campaign.affordabilityText && <BriefRow label="Affordability" value={campaign.affordabilityText} />}
                  {campaign.ctaStyle && <BriefRow label="CTA" value={campaign.ctaStyle} />}
                </BriefCard>
              )}
              {triggers.length > 0 && (
                <div className="rounded-xl border border-white/6 bg-[#0d0d0d] px-4 py-3 sm:col-span-2">
                  <p className="mb-2.5 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">Triggers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {includedTriggers.map((label) => (
                      <span key={label} className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/25 bg-[#00E676]/8 px-2 py-0.5 font-mono-data text-[10px] text-[#00E676]">
                        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                        {label}
                      </span>
                    ))}
                    {excludedTriggers.map((label) => (
                      <span key={label} className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2 py-0.5 font-mono-data text-[10px] text-muted-foreground/40 line-through">
                        <X className="h-2.5 w-2.5" strokeWidth={2} />
                        {label}
                      </span>
                    ))}
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
          </div>
        )}
      </div>

      {/* ── PRINT DOCUMENT (hidden on screen, shown on print) ── */}
      <div className="print-only" style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#111", background: "white", fontSize: "12px", lineHeight: "1.6" }}>

        {/* Header */}
        <div style={{ borderBottom: "2px solid #111", paddingBottom: "12px", marginBottom: "20px" }}>
          <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#666", marginBottom: "4px", fontFamily: "Arial, sans-serif" }}>Campaign Brief</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", fontFamily: "Arial, sans-serif", letterSpacing: "0.02em" }}>{campaign.title}</div>
          <div style={{ fontSize: "10px", color: "#888", marginTop: "4px", fontFamily: "Arial, sans-serif" }}>
            Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            {avatar && <span> &nbsp;·&nbsp; Avatar: <strong>{avatar.name}</strong></span>}
            {campaign.durationSeconds && <span> &nbsp;·&nbsp; Duration: <strong>{campaign.durationSeconds}s</strong></span>}
          </div>
        </div>

        {/* Objective */}
        <div style={{ background: "#f8f8f8", border: "1px solid #ddd", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", fontFamily: "Arial, sans-serif", marginBottom: "6px" }}>Objective</div>
          <div style={{ fontWeight: "bold", marginBottom: "4px", fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
            Create a professional, emotional, and persuasive CTV commercial that drives immediate phone call response.
          </div>
          <div style={{ fontSize: "11px", color: "#444" }}>
            The finished spot must feel like a real television ad — not a slideshow. High-quality editing, emotional pacing, and strategic b-roll are essential. Target audience: adults 55+ who respond to warmth, simplicity, and urgency.
          </div>
        </div>

        {/* Campaign Details */}
        {hasBriefContent && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", fontFamily: "Arial, sans-serif", marginBottom: "8px", borderBottom: "1px solid #eee", paddingBottom: "4px" }}>Campaign Details</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <tbody>
                {campaign.offerName && <PrintDetailRow label="Offer" value={campaign.offerName} />}
                {persona && <PrintDetailRow label="Persona" value={persona.label} />}
                {archetype && <PrintDetailRow label="Archetype" value={archetype.label} />}
                {tone && <PrintDetailRow label="Tone" value={tone.label} />}
                {campaign.phoneNumber && <PrintDetailRow label="Phone #" value={campaign.phoneNumber} bold />}
                {campaign.deadlineText && <PrintDetailRow label="Deadline" value={campaign.deadlineText} />}
                {campaign.benefitAmount && <PrintDetailRow label="Benefit Amount" value={campaign.benefitAmount} bold />}
                {campaign.affordabilityText && <PrintDetailRow label="Affordability" value={campaign.affordabilityText} />}
                {campaign.ctaStyle && <PrintDetailRow label="CTA Style" value={campaign.ctaStyle} />}
              </tbody>
            </table>
            {campaign.notes && (
              <div style={{ marginTop: "8px", padding: "8px 12px", background: "#fffef0", border: "1px solid #e8e0b0", borderRadius: "4px", fontSize: "11px" }}>
                <span style={{ fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#888" }}>Notes: </span>
                {campaign.notes}
              </div>
            )}
          </div>
        )}

        {/* Script */}
        {printScript && (
          <div style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", fontFamily: "Arial, sans-serif", marginBottom: "8px", borderBottom: "1px solid #eee", paddingBottom: "4px" }}>
              Script{latestScript?.durationSeconds ? ` — ${latestScript.durationSeconds}s` : ""}{latestScript?.versionName ? ` (${latestScript.versionName})` : ""}
            </div>
            <div style={{ background: "#fafafa", border: "1px solid #ddd", borderRadius: "6px", padding: "14px 16px", whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: "1.8", fontFamily: "Georgia, serif" }}>
              {printScript}
            </div>
          </div>
        )}

        {/* Psychological Trigger Sequence */}
        {triggers.filter((t) => t.included).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", fontFamily: "Arial, sans-serif", marginBottom: "4px", borderBottom: "1px solid #eee", paddingBottom: "4px" }}>
              Psychological Trigger Sequence
            </div>
            <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
              These triggers are baked into the script in this order — reinforce each beat visually with b-roll and text animation.
            </div>
            <ol style={{ margin: 0, paddingLeft: "20px" }}>
              {triggers
                .filter((t) => t.included)
                .sort((a, b) => (getTriggerByKey(a.triggerKey)?.masterOrder ?? 99) - (getTriggerByKey(b.triggerKey)?.masterOrder ?? 99))
                .map((t) => {
                  const seed = getTriggerByKey(t.triggerKey);
                  return seed ? (
                    <li key={t.triggerKey} style={{ marginBottom: "4px", fontSize: "11px" }}>
                      <strong>{seed.label}</strong> — {seed.description}
                    </li>
                  ) : null;
                })}
            </ol>
          </div>
        )}

        {/* Editing Guidelines */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", fontFamily: "Arial, sans-serif", marginBottom: "8px", borderBottom: "1px solid #eee", paddingBottom: "4px" }}>Editing Guidelines</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              <tr style={{ verticalAlign: "top" }}>
                <td style={{ width: "50%", paddingRight: "16px", paddingBottom: "10px" }}>
                  <div style={{ fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#444", marginBottom: "4px" }}>Editing Structure</div>
                  <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.7" }}>
                    <li><strong>Base Layer:</strong> Use the Avatar IV video as the primary track throughout the spot.</li>
                    <li><strong>B-Roll:</strong> Layer b-roll on top to illustrate key script moments — family, documents, phones, outdoor scenes.</li>
                    <li><strong>Pacing:</strong> Cut on beats and emotional peaks. No static holds over 3 seconds.</li>
                    <li><strong>Audience:</strong> 55+ viewers on connected TV — clean edits, no fast cuts or heavy VFX.</li>
                  </ul>
                </td>
                <td style={{ width: "50%", paddingBottom: "10px" }}>
                  <div style={{ fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#444", marginBottom: "4px" }}>Sound Design</div>
                  <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.7" }}>
                    <li>Warm, emotional background music throughout.</li>
                    <li>Duck music slightly under dialogue — voice must be clear.</li>
                    <li>Subtle sound effects on b-roll (paper, phone ring, door close).</li>
                    <li>Music swell on emotional peaks and CTA.</li>
                  </ul>
                </td>
              </tr>
              <tr style={{ verticalAlign: "top" }}>
                <td style={{ paddingRight: "16px", paddingBottom: "6px" }}>
                  <div style={{ fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#444", marginBottom: "4px" }}>Text Animation</div>
                  <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.7" }}>
                    <li>Emphasize key words with bold kinetic text on screen.</li>
                    <li>Phone number: large, high-contrast, hold for at least 3 seconds.</li>
                    <li>Benefit amount (e.g. "$25,000") reinforced visually when spoken.</li>
                    <li>Simple fade or slide-up only — nothing flashy.</li>
                  </ul>
                </td>
                <td style={{ paddingBottom: "6px" }}>
                  <div style={{ fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#444", marginBottom: "4px" }}>Retention &amp; CTA</div>
                  <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.7" }}>
                    <li>New cut or b-roll every 2–4 seconds during the body.</li>
                    <li>Re-introduce avatar face after long b-roll sequences.</li>
                    <li>Phone number on screen for full duration it is spoken.</li>
                    <li>End on a clean frame — not a hard cut to black.</li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Export Requirements */}
        <div style={{ border: "2px solid #111", borderRadius: "6px", padding: "12px 16px", marginBottom: "14px", pageBreakInside: "avoid" }}>
          <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "Arial, sans-serif", fontWeight: "bold", marginBottom: "10px" }}>⚠ Export Requirements — NON-NEGOTIABLE</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              <tr style={{ background: "#f0f0f0" }}>
                <td style={{ padding: "5px 10px", fontWeight: "bold", width: "120px", fontFamily: "Arial, sans-serif" }}>Duration</td>
                <td style={{ padding: "5px 10px", fontWeight: "bold" }}>EXACTLY 59 seconds &nbsp;–OR–&nbsp; EXACTLY 1 minute 29 seconds (1:29)</td>
              </tr>
              <tr><td style={{ padding: "4px 10px", fontFamily: "Arial, sans-serif", fontWeight: "600" }}>Resolution</td><td style={{ padding: "4px 10px" }}>1080p</td></tr>
              <tr style={{ background: "#f9f9f9" }}><td style={{ padding: "4px 10px", fontFamily: "Arial, sans-serif", fontWeight: "600" }}>Bitrate</td><td style={{ padding: "4px 10px" }}>12,000 Kbps</td></tr>
              <tr><td style={{ padding: "4px 10px", fontFamily: "Arial, sans-serif", fontWeight: "600" }}>Codec</td><td style={{ padding: "4px 10px" }}>H.264</td></tr>
              <tr style={{ background: "#f9f9f9" }}><td style={{ padding: "4px 10px", fontFamily: "Arial, sans-serif", fontWeight: "600" }}>Container</td><td style={{ padding: "4px 10px" }}>MP4</td></tr>
              <tr><td style={{ padding: "4px 10px", fontFamily: "Arial, sans-serif", fontWeight: "600" }}>Frame Rate</td><td style={{ padding: "4px 10px" }}>30fps</td></tr>
            </tbody>
          </table>
        </div>

        {/* Naming Convention */}
        <div style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "12px 16px", pageBreakInside: "avoid" }}>
          <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", fontFamily: "Arial, sans-serif", marginBottom: "8px" }}>File Naming Convention</div>
          <div style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: "bold", marginBottom: "6px" }}>Name-Platform-Last4.mp4</div>
          <div style={{ fontFamily: "monospace", fontSize: "13px", color: "#444", marginBottom: "8px" }}>Example: Martha-Roku-0026.mp4</div>
          <table style={{ fontSize: "11px", color: "#555", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ paddingRight: "24px" }}><strong>Martha</strong> = Avatar / spokesperson name</td>
                <td style={{ paddingRight: "24px" }}><strong>Roku</strong> = Distribution platform</td>
                <td><strong>0026</strong> = Last 4 digits of phone number</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </>
  );
}

function BriefCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-[#0d0d0d] px-4 py-3">
      <p className="mb-2.5 font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-20 shrink-0 font-mono-data text-[9px] uppercase tracking-wider text-muted-foreground/50">
        {label}
      </span>
      <span className="text-[13px] text-foreground/75">{value}</span>
    </div>
  );
}

function PrintDetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr>
      <td style={{ padding: "3px 10px 3px 0", fontFamily: "Arial, sans-serif", fontWeight: 600, fontSize: "11px", color: "#555", width: "130px", verticalAlign: "top" }}>{label}</td>
      <td style={{ padding: "3px 0", fontSize: "12px", fontWeight: bold ? "bold" : "normal" }}>{value}</td>
    </tr>
  );
}
