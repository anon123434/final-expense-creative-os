"use client";

import { useState } from "react";
import { UserCircle, RefreshCw } from "lucide-react";
import type { Avatar } from "@/types/avatar";
import { AvatarPickerModal } from "./avatar-picker-modal";

interface AvatarSectionProps {
  campaignId: string;
  avatar: Avatar | null;
}

export function AvatarSection({ campaignId, avatar: initialAvatar }: AvatarSectionProps) {
  const [avatar, setAvatar] = useState<Avatar | null>(initialAvatar);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Active Avatar
      </h2>

      <div className="rounded-lg border">
        {avatar ? (
          <div className="flex items-center gap-4 p-4">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              {avatar.imageUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar.imageUrls[0]}
                  alt={avatar.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <UserCircle className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{avatar.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {avatar.mode === "likeness_only" ? "Likeness Only" : "Likeness + Environment"}
                {" · "}
                {avatar.imageUrls.length} image{avatar.imageUrls.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Change
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4">
            <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-border flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">No avatar attached</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Attach a saved avatar to use its likeness in scripts and scene prompts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Attach Avatar
            </button>
          </div>
        )}
      </div>

      {pickerOpen && (
        <AvatarPickerModal
          campaignId={campaignId}
          currentAvatarId={avatar?.id ?? null}
          onClose={() => setPickerOpen(false)}
          onAttached={(newAvatar) => setAvatar(newAvatar)}
        />
      )}
    </section>
  );
}
