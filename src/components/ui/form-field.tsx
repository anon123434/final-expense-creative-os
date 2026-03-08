import * as React from "react";
import { cn } from "@/lib/utils";

// ── Input ──────────────────────────────────────────────────────────────────

export const inputClass =
  "flex h-9 w-full rounded border border-border bg-input text-foreground px-3 py-1 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/40 disabled:opacity-50 transition-colors";

export const selectClass =
  "flex h-9 w-full rounded border border-border bg-input text-foreground px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/40 disabled:opacity-50 transition-colors";

export const textareaClass =
  "flex min-h-[96px] w-full rounded border border-border bg-input text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/40 disabled:opacity-50 transition-colors resize-y";

// ── FormField wrapper ─────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {hint && <p className="text-xs text-muted-foreground/60">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── FormSection wrapper ───────────────────────────────────────────────────

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-3">
        <h3
          className="text-xs font-bold uppercase tracking-widest text-primary"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em" }}
        >
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
