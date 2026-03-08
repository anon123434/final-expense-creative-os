import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getConceptsByCampaign } from "@/lib/repositories/concept-repo";
import { ConceptGeneratorPanel } from "@/components/concepts/concept-generator-panel";

interface ConceptsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConceptsPage({ params }: ConceptsPageProps) {
  const { id } = await params;

  const [campaign, concepts] = await Promise.all([
    getCampaignById(id),
    getConceptsByCampaign(id),
  ]);

  if (!campaign) notFound();

  return (
    <ConceptGeneratorPanel
      campaignId={id}
      initialConcepts={concepts}
    />
  );
}
