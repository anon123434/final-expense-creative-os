import * as React from "react";
import { cn } from "@/lib/utils";

// ── Input ──────────────────────────────────────────────────────────────────

export const inputClass =
  "flex h-9 w-full rounded border bg-[#111111] border-[#1C1C1C] text-[#DEDEDE] px-3 py-1 text-sm placeholder:text-[#2E2E2E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FF88] focus-visible:border-[#00FF88]/40 disabled:opacity-50 transition-colors";

export const selectClass =
  "flex h-9 w-full rounded border bg-[#111111] border-[#1C1C1C] text-[#DEDEDE] px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FF88] focus-visible:border-[#00FF88]/40 disabled:opacity-50 transition-colors";

export const textareaClass =
  "flex min-h-[96px] w-full rounded border bg-[#111111] border-[#1C1C1C] text-[#DEDEDE] px-3 py-2 text-sm placeholder:text-[#2E2E2E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FF88] focus-visible:border-[#00FF88]/40 disabled:opacity-50 transition-colors";

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
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "#4A4A4A", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
        {required && <span className="ml-1" style={{ color: "#FF3131" }}>*</span>}
      </label>
      {hint && <p className="text-xs" style={{ color: "#333333" }}>{hint}</p>}
      {children}
      {error && (
        <p className="text-xs" style={{ color: "#FF3131" }}>{error}</p>
      )}
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
      <div className="pb-3" style={{ borderBottom: "1px solid #161616" }}>
        <h3
          className="text-xs font-700 uppercase tracking-widest"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            color: "#00FF88",
            letterSpacing: "0.1em",
          }}
        >
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs" style={{ color: "#333333" }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
