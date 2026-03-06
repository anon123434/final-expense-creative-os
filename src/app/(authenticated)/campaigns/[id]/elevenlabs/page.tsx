import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/repositories/campaign-repo";
import { getScriptsByCampaign } from "@/lib/repositories/script-repo";
import { getLatestVoScriptForScript } from "@/lib/repositories/voiceover-repo";
import { VoPanel } from "@/components/voiceover/vo-panel";

interface ElevenLabsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ElevenLabsPage({ params }: ElevenLabsPageProps) {
  const { id } = await params;

  const [campaign, scripts] = await Promise.all([
    getCampaignById(id),
    getScriptsByCampaign(id),
  ]);

  if (!campaign) notFound();

  // Pre-select the most recent script
  const defaultScript = scripts[0] ?? null;

  // Load any existing VO for that script
  const initialVo = defaultScript
    ? await getLatestVoScriptForScript(id, defaultScript.id)
    : null;

  return (
    <VoPanel
      campaignId={id}
      phoneNumber={campaign.phoneNumber}
      scripts={scripts}
      initialVo={initialVo}
      initialScriptId={defaultScript?.id ?? null}
    />
  );
}
