import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getLatestVisualPlanForScript } from "@/lib/repositories/visual-plan-repo";
import { VisualPlanPanel } from "@/components/visual-plan/visual-plan-panel";

interface VisualPlanPageProps {
  params: Promise<{ id: string }>;
}

export default async function VisualPlanPage({ params }: VisualPlanPageProps) {
  const { id } = await params;

  const [campaign, scripts] = await Promise.all([
    getCampaignById(id),
    getScriptsByCampaign(id),
  ]);

  if (!campaign) notFound();

  const defaultScript = scripts[0] ?? null;

  const initialPlan = defaultScript
    ? await getLatestVisualPlanForScript(id, defaultScript.id)
    : null;

  return (
    <VisualPlanPanel
      campaignId={id}
      scripts={scripts}
      initialPlan={initialPlan}
      initialScriptId={defaultScript?.id ?? null}
    />
  );
}
