import { notFound } from "next/navigation";
import { WorkspaceHeader } from "@/components/campaign/workspace-header";
import { WorkspaceTabs } from "@/components/campaign/workspace-tabs";
import { getCampaignById } from "@/lib/repositories/campaign-repo";

export default async function CampaignWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <WorkspaceHeader campaign={campaign} />
      <WorkspaceTabs campaignId={id} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
