import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignTable } from "@/components/campaign/campaign-table";
import type { CampaignRow } from "@/components/campaign/campaign-table";
import { getCampaigns } from "@/lib/repositories";
import { getPersonaByKey } from "@/lib/seed/personas";
import { getArchetypeByKey } from "@/lib/seed/archetypes";
import { DEFAULT_USER_ID } from "@/lib/config/env";

export default async function DashboardPage() {
  const userId = DEFAULT_USER_ID;
  const campaigns = await getCampaigns(userId);

  const rows: CampaignRow[] = campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    personaLabel: c.personaId ? (getPersonaByKey(c.personaId)?.label ?? c.personaId) : null,
    archetypeLabel: c.archetypeId ? (getArchetypeByKey(c.archetypeId)?.label ?? c.archetypeId) : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            {campaigns.length === 0
              ? "No campaigns yet"
              : `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      <CampaignTable campaigns={rows} />
    </div>
  );
}
