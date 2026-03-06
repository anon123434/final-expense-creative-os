"use client";

import { ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import type { AdConcept } from "@/types";
import { cn } from "@/lib/utils";

interface ConceptPickerProps {
  concepts: AdConcept[];
  selectedId: string | null;
  onSelect: (conceptId: string) => void;
  disabled?: boolean;
}

export function ConceptPicker({ concepts, selectedId, onSelect, disabled }: ConceptPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = concepts.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (concepts.length === 0) {
    return (
      <div className="flex h-10 items-center rounded-md border border-dashed px-3 text-sm text-muted-foreground">
        No concepts yet — generate concepts first.
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.title : "Select a concept…"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="py-1">
            {concepts.map((concept) => (
              <li key={concept.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(concept.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent",
                    concept.id === selectedId && "bg-accent/50"
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {concept.id === selectedId ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium">{concept.title}</span>
                    {concept.oneSentenceAngle && (
                      <span className="text-xs text-muted-foreground">{concept.oneSentenceAngle}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
