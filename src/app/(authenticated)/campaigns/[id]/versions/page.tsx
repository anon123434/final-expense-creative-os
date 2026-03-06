import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getVersionsByCampaign } from "@/lib/repositories/version-repo";
import { VersionsPanel } from "@/components/versions/versions-panel";

interface VersionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function VersionsPage({ params }: VersionsPageProps) {
  const { id } = await params;

  const [campaign, versions] = await Promise.all([
    getCampaignById(id),
    getVersionsByCampaign(id),
  ]);

  if (!campaign) notFound();

  return (
    <VersionsPanel
      campaignId={id}
      initialVersions={versions}
    />
  );
}
