"use client";

import { Printer } from "lucide-react";

export function PrintOverviewButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 font-mono-data text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
    >
      <Printer className="h-3.5 w-3.5" />
      Export Overview PDF
    </button>
  );
}
