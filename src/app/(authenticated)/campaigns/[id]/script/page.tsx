import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getConceptsByCampaign } from "@/lib/repositories/concept-repo";
import { getLatestScriptForConcept } from "@/lib/repositories/script-repo";
import { ScriptPanel } from "@/components/script/script-panel";

interface ScriptPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScriptPage({ params }: ScriptPageProps) {
  const { id } = await params;

  const [campaign, concepts] = await Promise.all([
    getCampaignById(id),
    getConceptsByCampaign(id),
  ]);

  if (!campaign) notFound();

  // Pre-select the default concept (first selected, or first in list)
  const defaultConcept =
    concepts.find((c) => c.isSelected) ?? concepts[0] ?? null;

  // Load existing script for the default concept, if any
  const initialScript = defaultConcept
    ? await getLatestScriptForConcept(id, defaultConcept.id)
    : null;

  return (
    <ScriptPanel
      campaign={campaign}
      concepts={concepts}
      initialScript={initialScript}
      initialConceptId={defaultConcept?.id ?? null}
    />
  );
}
