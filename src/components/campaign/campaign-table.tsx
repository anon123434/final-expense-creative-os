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
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/campaigns/${id}`)}
        className="gap-1.5"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open
      </Button>

      <DropdownMenu
        align="right"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled={isPending}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        }
      >
        <DropdownMenuItem onClick={handleDuplicate} disabled={isPending}>
          <Copy className="h-3.5 w-3.5" />
          {isPending ? "Duplicating…" : "Duplicate"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled
          className="text-muted-foreground"
          title="Coming soon"
        >
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
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">No campaigns yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first campaign to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Title
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Persona
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Archetype
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Created
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Updated
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign, i) => (
            <tr
              key={campaign.id}
              className="group border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
            >
              <td className="px-4 py-3 font-medium">{campaign.title}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {campaign.personaLabel ?? (
                  <span className="italic text-muted-foreground/60">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {campaign.archetypeLabel ?? (
                  <span className="italic text-muted-foreground/60">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground tabular-nums">
                {formatDate(campaign.createdAt)}
              </td>
              <td className="px-4 py-3 text-muted-foreground tabular-nums">
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
