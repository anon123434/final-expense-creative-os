"use client";

import { useState, useTransition, useEffect } from "react";
import { X, CheckCircle2, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Avatar } from "@/types/avatar";
import { getAvatarsAction, attachAvatarAction } from "@/app/actions/avatars";

interface AvatarPickerModalProps {
  campaignId: string;
  currentAvatarId: string | null;
  onClose: () => void;
  onAttached: (avatar: Avatar | null) => void;
}

export function AvatarPickerModal({
  campaignId, currentAvatarId, onClose, onAttached,
}: AvatarPickerModalProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [attaching, startAttach] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(currentAvatarId);

  useEffect(() => {
    getAvatarsAction().then((res) => {
      if (res.success) setAvatars(res.data);
      setLoading(false);
    });
  }, []);

  function handleAttach(avatarId: string | null) {
    setSelectedId(avatarId);
    startAttach(async () => {
      await attachAvatarAction(campaignId, avatarId);
      const avatar = avatarId ? avatars.find((a) => a.id === avatarId) ?? null : null;
      onAttached(avatar);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2
            className="text-sm font-bold uppercase tracking-widest"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--primary)" }}
          >
            Choose Avatar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="aspect-video rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : avatars.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <UserCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No avatars saved yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Generate avatars at /avatars first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {currentAvatarId && (
                <button
                  type="button"
                  onClick={() => handleAttach(null)}
                  disabled={attaching}
                  className="aspect-video rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              )}
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => handleAttach(avatar.id)}
                  disabled={attaching}
                  className={cn(
                    "relative aspect-video rounded-lg border overflow-hidden transition-colors",
                    selectedId === avatar.id
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {avatar.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar.imageUrls[0]}
                      alt={avatar.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center">
                      <UserCircle className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {selectedId === avatar.id && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle2 className="h-4 w-4 text-primary drop-shadow" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-[10px] text-white font-medium truncate">{avatar.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
