import type { CampaignTrigger } from "@/types";
import { triggers as TRIGGERS } from "@/lib/seed/triggers";
import type { TriggerSeed } from "@/lib/seed/triggers";

const BODY_SECTIONS = new Set(["credibility", "offer", "stakes", "mechanism", "affordability", "urgency"]);

const BODY_SECTION_LABELS: Record<string, string> = {
  credibility: "CREDIBILITY",
  offer: "OFFER",
  stakes: "STAKES",
  mechanism: "MECHANISM",
  affordability: "AFFORDABILITY",
  urgency: "URGENCY",
};

const BODY_SECTION_HINTS: Record<string, string> = {
  credibility: "Establish trust and legitimacy early to reduce skepticism.",
  offer: "Clearly present the value proposition and coverage benefit.",
  stakes: "Raise the emotional cost of inaction — burden, loss, regret.",
  mechanism: "Show how easy and straightforward the process is.",
  affordability: "Anchor the price to something trivially small.",
  urgency: "Create time pressure with a specific deadline or age cutoff.",
};

export interface TriggerSequenceContext {
  orderedKeys: string[];          // Selected triggers sorted by masterOrder
  hookTriggers: string[];         // Assigned to hook section
  bodyTriggers: string[];         // Assigned to body sections (credibility/offer/stakes/mechanism/affordability/urgency)
  ctaTriggers: string[];          // Assigned to cta section
  excludedKeys: string[];         // Explicitly excluded trigger keys
  phoneRepeatCount: 1 | 2;        // 1 for 30/60s, 2 for 90s
  includeWriteThatDown: boolean;  // true for 60s+, false for 30s
  sequenceText: string;           // Formatted text block for LLM prompt injection
}

export function getDefaultTriggers(durationSeconds: number): string[] {
  if (durationSeconds <= 30) {
    return ["authority", "loss_aversion", "simplicity", "urgency"];
  }
  if (durationSeconds >= 90) {
    // All 12, sorted by masterOrder
    return [...TRIGGERS]
      .sort((a, b) => a.masterOrder - b.masterOrder)
      .map((t) => t.key);
  }
  // 60s and any other duration
  return ["authority", "conspiracy_insider", "value_disparity", "loss_aversion", "simplicity", "affordability", "urgency"];
}

export function buildTriggerSequence(
  campaignTriggers: CampaignTrigger[],
  durationSeconds: number
): TriggerSequenceContext {
  // 1. Separate into included and excluded
  const included = campaignTriggers.filter((t) => t.included === true);
  const excluded = campaignTriggers.filter((t) => t.included === false);

  // 2 & 3. Extract keys
  let includedKeys = included.map((t) => t.triggerKey);
  const excludedKeys = excluded.map((t) => t.triggerKey);

  // 4. Fall back to defaults if nothing selected
  if (includedKeys.length === 0) {
    includedKeys = getDefaultTriggers(durationSeconds);
  }

  // 5 & 6. Look up seed data and sort by masterOrder
  const seedMap = new Map<string, TriggerSeed>(TRIGGERS.map((t) => [t.key, t]));

  const resolvedTriggers: TriggerSeed[] = includedKeys
    .map((key) => seedMap.get(key))
    .filter((t): t is TriggerSeed => t !== undefined)
    .sort((a, b) => a.masterOrder - b.masterOrder);

  const orderedKeys = resolvedTriggers.map((t) => t.key);

  // 7. Split into hook, body, cta
  const hookTriggers = resolvedTriggers
    .filter((t) => t.section === "hook")
    .map((t) => t.key);

  const ctaTriggers = resolvedTriggers
    .filter((t) => t.section === "cta")
    .map((t) => t.key);

  const bodyTriggers = resolvedTriggers
    .filter((t) => BODY_SECTIONS.has(t.section))
    .map((t) => t.key);

  // 8 & 9. Phone repeat and write-that-down flags
  const phoneRepeatCount: 1 | 2 = durationSeconds >= 90 ? 2 : 1;
  const includeWriteThatDown = durationSeconds >= 60;

  // 10. Build sequenceText
  const sequenceText = buildSequenceText({
    resolvedTriggers,
    hookTriggers,
    bodyTriggers,
    ctaTriggers,
    excludedKeys,
    durationSeconds,
  });

  return {
    orderedKeys,
    hookTriggers,
    bodyTriggers,
    ctaTriggers,
    excludedKeys,
    phoneRepeatCount,
    includeWriteThatDown,
    sequenceText,
  };
}

function buildSequenceText(params: {
  resolvedTriggers: TriggerSeed[];
  hookTriggers: string[];
  bodyTriggers: string[];
  ctaTriggers: string[];
  excludedKeys: string[];
  durationSeconds: number;
}): string {
  const {
    resolvedTriggers,
    hookTriggers,
    bodyTriggers,
    ctaTriggers,
    excludedKeys,
    durationSeconds,
  } = params;

  const lines: string[] = [];

  lines.push("PSYCHOLOGICAL TRIGGER SEQUENCE FOR THIS SCRIPT:");
  lines.push("Place triggers in this order across the script sections:");
  lines.push("");

  // HOOK
  const hookLabels = hookTriggers.map((k) => {
    const seed = resolvedTriggers.find((t) => t.key === k);
    return seed ? seed.label : k;
  });
  if (hookLabels.length > 0) {
    lines.push(`HOOK: ${hookLabels.join(" → ")}`);
    lines.push("  (Open with immediate credibility and pattern-interrupt to stop the scroll.)");
    lines.push("");
  }

  // BODY — group by section in masterOrder sequence
  if (bodyTriggers.length > 0) {
    lines.push("BODY:");

    // Build an ordered list of unique body sections as they appear in resolvedTriggers
    const seenSections = new Set<string>();
    const orderedBodySections: string[] = [];
    for (const t of resolvedTriggers) {
      if (BODY_SECTIONS.has(t.section) && !seenSections.has(t.section)) {
        seenSections.add(t.section);
        orderedBodySections.push(t.section);
      }
    }

    for (const section of orderedBodySections) {
      const sectionTriggers = resolvedTriggers.filter((t) => t.section === section);
      if (sectionTriggers.length === 0) continue;
      const label = BODY_SECTION_LABELS[section] ?? section.toUpperCase();
      const hint = BODY_SECTION_HINTS[section] ?? "";
      const triggerLabels = sectionTriggers.map((t) => t.label).join(", ");
      lines.push(`  - ${label}: ${triggerLabels}`);
      if (hint) {
        lines.push(`    (${hint})`);
      }
    }
    lines.push("");
  }

  // CTA
  const ctaLabels = ctaTriggers.map((k) => {
    const seed = resolvedTriggers.find((t) => t.key === k);
    return seed ? seed.label : k;
  });
  if (ctaLabels.length > 0) {
    lines.push(`CTA: ${ctaLabels.join(" → ")}`);
    lines.push("  (Deadline close, then empower with action.)");
    lines.push("");
  }

  // Excluded triggers (only if present)
  if (excludedKeys.length > 0) {
    lines.push(`EXCLUDED TRIGGERS (do not use this language): ${excludedKeys.join(", ")}`);
    lines.push("");
  }

  // Duration-specific CTA rules
  if (durationSeconds >= 90) {
    lines.push("90-SECOND CTA RULES:");
    lines.push("  - Phone number appears EXACTLY TWICE");
    lines.push('  - After first mention: "Write that down." (sentence break, own line)');
    lines.push("  - Between mentions: one emotional resolve line (guilt_avoidance or loss_aversion tone) + one urgency line with specific deadline");
    lines.push('  - After second mention: simplicity or autonomy close ("The call is free.")');
    lines.push("  - Minimum 4 words between the two phone mentions");
  } else if (durationSeconds >= 60) {
    lines.push("60-SECOND CTA RULES:");
    lines.push("  - Phone number appears exactly ONCE at end of CTA");
    lines.push('  - Optional: "Write that down." after the phone number');
  } else {
    lines.push("30-SECOND CTA RULES:");
    lines.push("  - Phone number appears exactly ONCE at end of CTA");
    lines.push('  - Do NOT use "Write that down."');
  }

  return lines.join("\n");
}
