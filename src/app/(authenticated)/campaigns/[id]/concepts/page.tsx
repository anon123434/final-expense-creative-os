import { Lightbulb } from "lucide-react";
import { TabPlaceholder } from "@/components/campaign/tab-placeholder";
import { ProviderBadge } from "@/components/ui/provider-badge";

export default function ConceptsTab() {
  return (
    <div className="space-y-2">
      <div className="flex justify-end px-1">
        <ProviderBadge provider="claude" />
      </div>
      <TabPlaceholder
        icon={Lightbulb}
        title="Ad Concepts"
        description="Generate multiple creative concepts based on your brief — each with a hook, emotional arc, CTA, and visual world."
        hint="Concept generation coming next."
      />
    </div>
  );
}
