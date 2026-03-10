"use client";

import { PipelineCard } from "./pipeline-card";

export type StageStatus = "completed" | "active" | "locked";

export interface PipelineStage {
  id: string;
  title: string;
  description: string;
  iconName: string;
  status: StageStatus;
  href: string;
}

export function PipelineGrid({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="print:hidden grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stages.map((stage, i) => (
        <PipelineCard key={stage.id} stage={stage} index={i} />
      ))}
    </div>
  );
}
