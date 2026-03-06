import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function CampaignNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-bold">Campaign not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This campaign doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
