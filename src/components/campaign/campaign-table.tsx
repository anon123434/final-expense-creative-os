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
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/campaigns/${id}`)}
        className="gap-1.5 h-7 text-xs"
      >
        <ExternalLink className="h-3 w-3" />
        Open
      </Button>

      <DropdownMenu
        align="right"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
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

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const router = useRouter();

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded border border-dashed py-20 text-center">
        <p className="text-sm font-medium text-foreground">No campaigns yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first campaign to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Title</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Persona</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Archetype</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Created</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr
              key={campaign.id}
              className="group border-b last:border-0 cursor-pointer transition-colors hover:bg-accent"
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
            >
              <td className="px-4 py-3 font-medium text-foreground">{campaign.title}</td>
              <td className="px-4 py-3">
                {campaign.personaLabel ? (
                  <span
                    className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                      color: "var(--primary)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {campaign.personaLabel}
                  </span>
                ) : (
                  <span className="text-muted-foreground/30">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {campaign.archetypeLabel ?? <span className="text-muted-foreground/30">—</span>}
              </td>
              <td
                className="px-4 py-3 text-xs tabular-nums text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatDate(campaign.createdAt)}
              </td>
              <td
                className="px-4 py-3 text-xs tabular-nums text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatDate(campaign.updatedAt)}
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <CampaignRowActions id={campaign.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
