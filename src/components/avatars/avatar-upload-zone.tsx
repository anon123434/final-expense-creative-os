"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadZoneProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export function AvatarUploadZone({ value, onChange, disabled }: AvatarUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  if (value) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border aspect-video w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Reference" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
          aria-label="Remove image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div
          className="absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            background: "color-mix(in srgb, var(--primary) 20%, transparent)",
            color: "var(--primary)",
            border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          Reference loaded
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center transition-colors cursor-pointer",
        dragging ? "border-primary/60 bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/30",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        disabled={disabled}
      />
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
        {dragging ? (
          <Upload className="h-5 w-5" style={{ color: "var(--primary)" }} />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {dragging ? "Drop to upload" : "Upload reference image"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Optional · JPG, PNG, WEBP · max 10MB
      </p>
    </div>
  );
}
