import { getSettingsStatusAction } from "@/app/actions/settings";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const result = await getSettingsStatusAction();

  const maskedKeys = result.success ? result.maskedKeys : {};

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage API keys for model providers. Keys are stored securely and never
          leave the server.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <SettingsForm maskedKeys={maskedKeys} />
      </div>
    </div>
  );
}
