import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getLatestVisualPlanForScript, getGeneratedAssetsForCampaign } from "@/lib/repositories/visual-plan-repo";
import { getAvatarById } from "@/lib/repositories/avatar-repo";
import { getCharactersByCampaign } from "@/lib/repositories/campaign-character-repo";
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

  const [initialPlan, avatar, initialAssets, initialCharacters] = await Promise.all([
    defaultScript ? getLatestVisualPlanForScript(id, defaultScript.id) : Promise.resolve(null),
    campaign.avatarId ? getAvatarById(campaign.avatarId) : Promise.resolve(null),
    getGeneratedAssetsForCampaign(id),
    getCharactersByCampaign(id),
  ]);

  return (
    <VisualPlanPanel
      campaignId={id}
      scripts={scripts}
      initialPlan={initialPlan}
      initialScriptId={defaultScript?.id ?? null}
      initialAvatar={avatar}
      initialAssets={initialAssets}
      initialCharacters={initialCharacters}
    />
  );
}
