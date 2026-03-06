"use client";

import { useState, useTransition } from "react";
import { GitBranch, Save, AlertCircle, GitCommitHorizontal } from "lucide-react";
import type { CampaignVersion } from "@/types/version";
import { VersionListItem } from "./version-list-item";
import { saveVersionAction } from "@/app/actions/versions";
import { cn } from "@/lib/utils";

interface VersionsPanelProps {
  campaignId: string;
  initialVersions: CampaignVersion[];
}

export function VersionsPanel({ campaignId, initialVersions }: VersionsPanelProps) {
  const [versions, setVersions] = useState<CampaignVersion[]>(initialVersions);
  const [versionName, setVersionName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [saving, startSaving] = useTransition();

  function handleSave() {
    if (!versionName.trim()) return;
    setError(null);
    startSaving(async () => {
      const result = await saveVersionAction(campaignId, versionName.trim());
      if (result.success) {
        setVersions((prev) => [result.version, ...prev]);
        setVersionName("");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRestored(versionId: string, _restoredItems: string[]) {
    // Could highlight the restored version; for now it's handled inline in the item
    void versionId;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Save version section */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Save Current Version
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Captures a full snapshot: campaign fields, triggers, selected concept, script,
            voiceover, visual plan, and prompt pack.
          </p>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={versionName}
            onChange={(e) => {
              setVersionName(e.target.value);
              setSaveStatus("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && !saving && versionName.trim() && handleSave()}
            placeholder="e.g. After script revisions, Pre-client review…"
            maxLength={80}
            disabled={saving}
            className={cn(
              "flex-1 rounded-md border bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          <button
            type="button"
            disabled={!versionName.trim() || saving}
            onClick={handleSave}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            )}
          >
            <Save className={cn("h-4 w-4", saving && "animate-pulse")} />
            {saving ? "Saving…" : "Save Version"}
          </button>
        </div>

        {saveStatus === "saved" && (
          <p className="text-xs font-medium text-emerald-600">
            Version saved — full snapshot captured.
          </p>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </section>

      {/* Version list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved Versions
          </h2>
          <span className="text-xs text-muted-foreground">{versions.length} total</span>
        </div>

        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <GitBranch className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No versions saved yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Enter a version name above and click "Save Version" to create your first snapshot.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <VersionListItem
                key={version.id}
                version={version}
                onRestored={handleRestored}
              />
            ))}
          </div>
        )}
      </section>

      {/* Schema note */}
      {versions.length > 0 && (
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <GitCommitHorizontal className="h-3 w-3" />
          Snapshots are stored as schema v1 JSON. Restore creates new rows — existing content is
          not overwritten.
        </p>
      )}
    </div>
  );
}
