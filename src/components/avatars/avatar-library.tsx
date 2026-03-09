"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { Avatar } from "@/types/avatar";
import { deleteAvatarAction } from "@/app/actions/avatars";

interface AvatarLibraryProps {
  avatars: Avatar[];
  onAvatarsChange: (avatars: Avatar[]) => void;
}

export function AvatarLibrary({ avatars, onAvatarsChange }: AvatarLibraryProps) {
  const [deleting, startDelete] = useTransition();

  function handleDelete(avatarId: string) {
    startDelete(async () => {
      await deleteAvatarAction(avatarId);
      onAvatarsChange(avatars.filter((a) => a.id !== avatarId));
    });
  }

  if (avatars.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Saved Avatars
        </p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {avatars.length}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {avatars.map((avatar) => (
          <div
            key={avatar.id}
            className="group relative shrink-0 w-40 rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
          >
            <div className="aspect-video w-full overflow-hidden bg-muted">
              {avatar.imageUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar.imageUrls[0]}
                  alt={avatar.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
            <div className="p-2 space-y-0.5">
              <p className="text-xs font-medium truncate text-foreground">{avatar.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(avatar.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(avatar.id)}
              disabled={deleting}
              className="absolute top-1.5 right-1.5 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white hover:bg-destructive"
              aria-label="Delete avatar"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
