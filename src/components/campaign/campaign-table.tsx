"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ExternalLink, Copy, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { duplicateCampaignAction } from "@/app/actions/campaign";

export interface CampaignRow {
  id: string;
  title: string;
  personaLabel: string | null;
  archetypeLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CampaignTableProps {
  campaigns: CampaignRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CampaignRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDuplicate() {
    startTransition(async () => {
      await duplicateCampaignAction(id);
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => router.push(`/campaigns/${id}`)}
        className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-all duration-150"
        style={{
          color: "#00FF88",
          border: "1px solid rgba(0,255,136,0.2)",
          background: "rgba(0,255,136,0.05)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 10px rgba(0,255,136,0.2)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,136,0.4)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,136,0.2)";
        }}
      >
        <ExternalLink className="h-3 w-3" />
        Open
      </button>

      <DropdownMenu
        align="right"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            style={{ color: "#2E2E2E" }}
            disabled={isPending}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="sr-only">More actions</span>
          </Button>
        }
      >
        <DropdownMenuItem onClick={handleDuplicate} disabled={isPending}>
          <Copy className="h-3.5 w-3.5" />
          {isPending ? "Duplicating…" : "Duplicate"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled title="Coming soon">
          <Archive className="h-3.5 w-3.5" />
          Archive
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  );
}

const TH_STYLE = {
  color: "#2A2A2A",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  fontWeight: 500,
};

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const router = useRouter();

  if (campaigns.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded py-20 text-center terminal-grid"
        style={{ border: "1px dashed #1A1A1A" }}
      >
        <div
          className="mb-3 h-8 w-8 rounded flex items-center justify-center"
          style={{ border: "1px solid #1C1C1C", background: "#0D0D0D" }}
        >
          <span style={{ color: "#2A2A2A", fontSize: "18px" }}>+</span>
        </div>
        <p className="text-sm font-medium" style={{ color: "#3A3A3A" }}>No campaigns yet</p>
        <p className="mt-1 text-xs" style={{ color: "#252525" }}>
          Create your first campaign to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded overflow-hidden" style={{ border: "1px solid #1C1C1C" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "#0A0A0A", borderBottom: "1px solid #161616" }}>
            <th className="px-4 py-3 text-left" style={TH_STYLE}>Title</th>
            <th className="px-4 py-3 text-left" style={TH_STYLE}>Persona</th>
            <th className="px-4 py-3 text-left" style={TH_STYLE}>Archetype</th>
            <th className="px-4 py-3 text-left" style={TH_STYLE}>Created</th>
            <th className="px-4 py-3 text-left" style={TH_STYLE}>Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr
              key={campaign.id}
              className="group cursor-pointer transition-all duration-100"
              style={{ borderBottom: "1px solid #111111", background: "#0D0D0D" }}
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#101010";
                (e.currentTarget as HTMLElement).style.borderLeft = "2px solid rgba(0,255,136,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#0D0D0D";
                (e.currentTarget as HTMLElement).style.borderLeft = "none";
              }}
            >
              <td className="px-4 py-3 font-medium" style={{ color: "#DEDEDE" }}>
                {campaign.title}
              </td>
              <td className="px-4 py-3">
                {campaign.personaLabel ? (
                  <span
                    className="inline-flex items-center rounded px-2 py-0.5 text-xs"
                    style={{
                      background: "rgba(0,255,136,0.06)",
                      border: "1px solid rgba(0,255,136,0.12)",
                      color: "#00FF88",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {campaign.personaLabel}
                  </span>
                ) : (
                  <span style={{ color: "#252525" }}>—</span>
                )}
              </td>
              <td className="px-4 py-3" style={{ color: "#3A3A3A", fontSize: "12px" }}>
                {campaign.archetypeLabel ?? <span style={{ color: "#1E1E1E" }}>—</span>}
              </td>
              <td
                className="px-4 py-3 tabular-nums text-xs"
                style={{ color: "#2E2E2E", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatDate(campaign.createdAt)}
              </td>
              <td
                className="px-4 py-3 tabular-nums text-xs"
                style={{ color: "#2E2E2E", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatDate(campaign.updatedAt)}
              </td>
              <td
                className="px-4 py-3"
                onClick={(e) => e.stopPropagation()}
              >
                <CampaignRowActions id={campaign.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
