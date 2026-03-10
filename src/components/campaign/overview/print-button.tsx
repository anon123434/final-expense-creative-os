"use client";

import { Printer } from "lucide-react";

export interface TriggerPrintItem {
  key: string;
  label: string;
  description: string;
  masterOrder: number;
}

export interface PrintData {
  filename: string;
  campaignTitle: string;
  generatedDate: string;
  avatarName: string | null;
  durationSeconds: number | null;
  // Brief
  offerName: string | null;
  personaLabel: string | null;
  archetypeLabel: string | null;
  toneLabel: string | null;
  phoneNumber: string | null;
  deadlineText: string | null;
  benefitAmount: string | null;
  affordabilityText: string | null;
  ctaStyle: string | null;
  notes: string | null;
  // Script
  scriptText: string | null;
  scriptDuration: number | null;
  scriptVersion: string | null;
  // Concept
  conceptTitle: string | null;
  // Triggers (included only, sorted by masterOrder)
  triggers: TriggerPrintItem[];
}

function row(label: string, value: string | null, bold = false): string {
  if (!value) return "";
  return `<tr>
    <td style="padding:4px 12px 4px 0;font-weight:600;color:#555;width:140px;vertical-align:top;font-size:11px">${label}</td>
    <td style="padding:4px 0;font-size:12px;${bold ? "font-weight:700" : ""}">${value}</td>
  </tr>`;
}

function section(title: string, content: string): string {
  return `<div style="margin-bottom:18px">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:#999;font-weight:600;border-bottom:1px solid #e8e8e8;padding-bottom:5px;margin-bottom:10px">${title}</div>
    ${content}
  </div>`;
}

function generateHTML(d: PrintData): string {
  const briefRows = [
    row("Offer", d.offerName),
    row("Persona", d.personaLabel),
    row("Archetype", d.archetypeLabel),
    row("Tone", d.toneLabel),
    row("Duration", d.durationSeconds ? `${d.durationSeconds} seconds` : null),
    row("Phone #", d.phoneNumber, true),
    row("Deadline", d.deadlineText),
    row("Benefit", d.benefitAmount, true),
    row("Affordability", d.affordabilityText),
    row("CTA Style", d.ctaStyle),
  ].filter(Boolean).join("");

  const notesHTML = d.notes
    ? `<div style="margin-top:8px;padding:8px 12px;background:#fffef0;border:1px solid #e0d890;border-radius:4px;font-size:11px;color:#444"><span style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#888;font-weight:600">Notes: </span>${d.notes}</div>`
    : "";

  const briefSection = (briefRows || notesHTML)
    ? section("Campaign Details", `<table style="width:100%;border-collapse:collapse"><tbody>${briefRows}</tbody></table>${notesHTML}`)
    : "";

  const scriptSection = d.scriptText
    ? section(
        `Script${d.scriptDuration ? ` — ${d.scriptDuration}s` : ""}${d.scriptVersion ? ` (${d.scriptVersion})` : ""}`,
        `<div style="background:#fafafa;border:1px solid #e0e0e0;border-radius:6px;padding:14px 16px;white-space:pre-wrap;font-size:12.5px;line-height:1.85;font-family:Georgia,'Times New Roman',serif">${d.scriptText}</div>`
      )
    : "";

  const triggerItems = d.triggers.length
    ? d.triggers.map((t, i) =>
        `<li style="margin-bottom:5px;font-size:11.5px"><strong>${t.masterOrder}. ${t.label}</strong> — ${t.description}</li>`
      ).join("")
    : "";

  const triggerSection = triggerItems
    ? section(
        "Psychological Trigger Sequence",
        `<p style="font-size:10.5px;color:#666;margin:0 0 8px">These triggers are embedded in the script in persuasion order — reinforce each beat visually with b-roll and text animation.</p><ol style="margin:0;padding-left:0;list-style:none">${triggerItems}</ol>`
      )
    : "";

  const editingSection = section("Editing Guidelines", `
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <tr style="vertical-align:top">
        <td style="width:50%;padding-right:18px;padding-bottom:12px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#555;font-weight:700;margin-bottom:5px">Editing Structure</div>
          <ul style="margin:0;padding-left:16px;line-height:1.75;color:#333">
            <li><strong>Base Layer:</strong> Use the Avatar IV video as the primary track throughout the spot.</li>
            <li><strong>B-Roll:</strong> Layer footage on top to illustrate key script moments — family, documents, phones, outdoor scenes.</li>
            <li><strong>Pacing:</strong> Cut on beats and emotional peaks. No static holds over 3 seconds.</li>
            <li><strong>Audience:</strong> 55+ viewers on connected TV — clean edits, no fast cuts or heavy VFX.</li>
          </ul>
        </td>
        <td style="width:50%;padding-bottom:12px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#555;font-weight:700;margin-bottom:5px">Sound Design</div>
          <ul style="margin:0;padding-left:16px;line-height:1.75;color:#333">
            <li>Warm, emotional background music throughout.</li>
            <li>Duck music under dialogue — voice must be perfectly clear.</li>
            <li>Subtle sound effects on b-roll (paper, phone, door).</li>
            <li>Music swell on emotional peaks and CTA.</li>
          </ul>
        </td>
      </tr>
      <tr style="vertical-align:top">
        <td style="padding-right:18px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#555;font-weight:700;margin-bottom:5px">Text Animation</div>
          <ul style="margin:0;padding-left:16px;line-height:1.75;color:#333">
            <li>Emphasize key words with bold kinetic text on screen.</li>
            <li>Phone number: large, high-contrast, hold ≥ 3 seconds.</li>
            <li>${d.benefitAmount ? `Benefit amount (${d.benefitAmount}) reinforced visually when spoken.` : "Benefit amount reinforced visually when spoken."}</li>
            <li>Simple fade or slide-up only — nothing flashy.</li>
          </ul>
        </td>
        <td>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#555;font-weight:700;margin-bottom:5px">Retention &amp; CTA</div>
          <ul style="margin:0;padding-left:16px;line-height:1.75;color:#333">
            <li>New cut or b-roll every 2–4 seconds in the body.</li>
            <li>Re-introduce avatar face after long b-roll sequences.</li>
            <li>Phone number on screen for full duration it is spoken.</li>
            <li>End on a clean frame — not a hard cut to black.</li>
          </ul>
        </td>
      </tr>
    </table>
  `);

  const exportSection = `<div style="border:2.5px solid #111;border-radius:6px;padding:14px 18px;margin-bottom:18px;page-break-inside:avoid">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;margin-bottom:12px">⚠ Export Requirements — NON-NEGOTIABLE</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr style="background:#f2f2f2">
        <td style="padding:6px 12px;font-weight:700;width:130px">Duration</td>
        <td style="padding:6px 12px;font-weight:700">EXACTLY 59 seconds &nbsp;—OR—&nbsp; EXACTLY 1 minute 29 seconds (1:29)</td>
      </tr>
      <tr><td style="padding:5px 12px;font-weight:600;color:#333">Resolution</td><td style="padding:5px 12px">1080p</td></tr>
      <tr style="background:#f8f8f8"><td style="padding:5px 12px;font-weight:600;color:#333">Bitrate</td><td style="padding:5px 12px">12,000 Kbps</td></tr>
      <tr><td style="padding:5px 12px;font-weight:600;color:#333">Codec</td><td style="padding:5px 12px">H.264</td></tr>
      <tr style="background:#f8f8f8"><td style="padding:5px 12px;font-weight:600;color:#333">Container</td><td style="padding:5px 12px">MP4</td></tr>
      <tr><td style="padding:5px 12px;font-weight:600;color:#333">Frame Rate</td><td style="padding:5px 12px">30 fps</td></tr>
    </table>
  </div>`;

  const namingSection = `<div style="border:1px solid #ccc;border-radius:6px;padding:14px 18px;page-break-inside:avoid">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:#999;font-weight:600;margin-bottom:10px">File Naming Convention</div>
    <div style="font-family:monospace;font-size:16px;font-weight:700;margin-bottom:5px;letter-spacing:0.02em">Name-Platform-Last4.mp4</div>
    <div style="font-family:monospace;font-size:13px;color:#555;margin-bottom:12px">Example: &nbsp;Martha-Roku-0026.mp4</div>
    <table style="font-size:11px;color:#555;border-collapse:collapse">
      <tr>
        <td style="padding-right:28px"><strong>Martha</strong> = Avatar / spokesperson name</td>
        <td style="padding-right:28px"><strong>Roku</strong> = Distribution platform</td>
        <td><strong>0026</strong> = Last 4 digits of phone number</td>
      </tr>
    </table>
  </div>`;

  const metaLine = [
    d.avatarName ? `Avatar: <strong>${d.avatarName}</strong>` : null,
    d.durationSeconds ? `Duration: <strong>${d.durationSeconds}s</strong>` : null,
    d.conceptTitle ? `Concept: <strong>${d.conceptTitle}</strong>` : null,
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(d.filename)}</title>
  <style>
    @page { size: letter; margin: 0.7in 0.8in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.55;
      color: #111;
      background: white;
    }
    strong { font-weight: 700; }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="border-bottom:2.5px solid #111;padding-bottom:14px;margin-bottom:20px">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.16em;color:#999;font-weight:600;margin-bottom:5px">Campaign Brief</div>
    <div style="font-size:24px;font-weight:700;letter-spacing:0.01em">${escapeHtml(d.campaignTitle)}</div>
    <div style="font-size:10.5px;color:#777;margin-top:5px">${d.generatedDate}${metaLine ? ` &nbsp;·&nbsp; ${metaLine}` : ""}</div>
  </div>

  <!-- Objective -->
  <div style="background:#f6f6f6;border:1px solid #e0e0e0;border-radius:6px;padding:12px 16px;margin-bottom:18px">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:#999;font-weight:600;margin-bottom:6px">Objective</div>
    <div style="font-size:13px;font-weight:700;margin-bottom:4px">Create a professional, emotional, and persuasive CTV commercial that drives immediate phone call response.</div>
    <div style="font-size:11px;color:#444;line-height:1.6">The finished spot must feel like a real television ad — not a slideshow. High-quality editing, emotional pacing, and strategic b-roll are essential. Target audience: adults 55+ who respond to warmth, simplicity, and urgency.</div>
  </div>

  ${briefSection}
  ${scriptSection}
  ${triggerSection}
  ${editingSection}
  ${exportSection}
  ${namingSection}

  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function PrintOverviewButton({ data }: { data: PrintData }) {
  function handleExport() {
    const html = generateHTML(data);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 font-mono-data text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
    >
      <Printer className="h-3.5 w-3.5" />
      Export Overview PDF
    </button>
  );
}
