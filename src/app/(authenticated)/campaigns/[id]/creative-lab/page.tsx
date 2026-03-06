import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getVariationsByCampaign } from "@/lib/repositories/variation-repo";
import { CreativeLabPanel } from "@/components/creative-lab/creative-lab-panel";

interface CreativeLabPageProps {
  params: Promise<{ id: string }>;
}

export default async function CreativeLabPage({ params }: CreativeLabPageProps) {
  const { id } = await params;

  const [campaign, variations] = await Promise.all([
    getCampaignById(id),
    getVariationsByCampaign(id),
  ]);

  if (!campaign) notFound();

  return (
    <CreativeLabPanel
      campaignId={id}
      initialVariations={variations}
    />
  );
}
