"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  Mic,
  Film,
  Image,
  GitBranch,
  FlaskConical,
} from "lucide-react";

interface WorkspaceTabsProps {
  campaignId: string;
}

const tabs = [
  { label: "Overview", segment: "", icon: LayoutDashboard },
  { label: "Concepts", segment: "/concepts", icon: Lightbulb },
  { label: "Script", segment: "/script", icon: FileText },
  { label: "ElevenLabs", segment: "/elevenlabs", icon: Mic },
  { label: "Visual Plan", segment: "/visual-plan", icon: Film },
  { label: "Prompts", segment: "/prompts", icon: Image },
  { label: "Versions", segment: "/versions", icon: GitBranch },
  { label: "Creative Lab", segment: "/creative-lab", icon: FlaskConical },
];

export function WorkspaceTabs({ campaignId }: WorkspaceTabsProps) {
  const pathname = usePathname();
  const basePath = `/campaigns/${campaignId}`;

  return (
    <div className="border-b print:hidden">
      <nav className="flex gap-1 px-6" aria-label="Campaign workspace tabs">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.segment}`;
          const isActive =
            tab.segment === ""
              ? pathname === basePath
              : pathname.startsWith(href);

          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
