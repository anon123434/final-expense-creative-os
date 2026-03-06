import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getLatestVisualPlanForScript } from "@/lib/repositories/visual-plan-repo";
import { getPromptPackByVisualPlan } from "@/lib/repositories/prompt-repo";
import { PromptPanel } from "@/components/prompts/prompt-panel";

interface PromptsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PromptsPage({ params }: PromptsPageProps) {
  const { id } = await params;

  const [campaign, scripts] = await Promise.all([
    getCampaignById(id),
    getScriptsByCampaign(id),
  ]);

  if (!campaign) notFound();

  // Default to the most recent script
  const defaultScript = scripts[0] ?? null;

  // Find the most recent visual plan for that script
  const defaultVisualPlan = defaultScript
    ? await getLatestVisualPlanForScript(id, defaultScript.id)
    : null;

  // Load any existing prompt pack for that visual plan
  const initialPack =
    defaultVisualPlan
      ? await getPromptPackByVisualPlan(id, defaultVisualPlan.id)
      : null;

  return (
    <PromptPanel
      campaignId={id}
      scripts={scripts}
      initialPack={initialPack}
      initialScriptId={defaultScript?.id ?? null}
      initialVisualPlanId={defaultVisualPlan?.id ?? null}
    />
  );
}
