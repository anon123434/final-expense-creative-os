import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignTable } from "@/components/campaign/campaign-table";
import type { CampaignRow } from "@/components/campaign/campaign-table";
import { getCampaigns } from "@/lib/repositories";
import { getPersonaByKey } from "@/lib/seed/personas";
import { getArchetypeByKey } from "@/lib/seed/archetypes";
import { createClient } from "@/lib/supabase/server";

async function getCurrentUserId(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? "user-mock-001";
  } catch {
    return "user-mock-001";
  }
}

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
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
          <h1
            className="text-3xl font-bold uppercase tracking-widest"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "#DEDEDE",
              letterSpacing: "0.08em",
            }}
          >
            Campaigns
          </h1>
          <p
            className="mt-1 text-[11px] tracking-widest uppercase"
            style={{ color: "#2A2A2A", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {campaigns.length === 0
              ? "No active campaigns"
              : `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} active`}
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2 text-xs font-bold uppercase tracking-wider">
            <PlusCircle className="h-3.5 w-3.5" />
            New Campaign
          </Button>
        </Link>
      </div>

      <CampaignTable campaigns={rows} />
    </div>
  );
}
