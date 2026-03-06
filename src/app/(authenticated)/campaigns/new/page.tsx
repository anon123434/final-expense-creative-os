import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignForm } from "@/components/campaign/campaign-form";

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
        <p className="text-sm text-muted-foreground">
          Set up the creative brief. You can refine any field from the workspace later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Brief</CardTitle>
          <CardDescription>
            These details drive concept, script, and voiceover generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignForm />
        </CardContent>
      </Card>
    </div>
  );
}
