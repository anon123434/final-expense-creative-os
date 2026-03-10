"use client";

import { User } from "lucide-react";
import { useState, useEffect } from "react";

interface AvatarHeroProps {
  avatar: { name: string; imageUrl: string | null } | null;
  completedCount: number;
  totalStages: number;
}

export function AvatarHero({ avatar, completedCount, totalStages }: AvatarHeroProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const pct = Math.round((completedCount / totalStages) * 100);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes ringA {
          0%, 100% { opacity: 0.18; transform: scale(1);    }
          50%       { opacity: 0.38; transform: scale(1.06); }
        }
        @keyframes ringB {
          0%, 100% { opacity: 0.07; transform: scale(1);    }
          50%       { opacity: 0.16; transform: scale(1.12); }
        }
        @keyframes connectorDraw {
          from { opacity: 0; height: 0;      }
          to   { opacity: 1; height: 2.25rem; }
        }
        .pipeline-card {
          animation: fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .ring-a { animation: ringA 3.2s ease-in-out infinite; }
        .ring-b { animation: ringB 4.5s ease-in-out infinite; animation-delay: 0.8s; }
      `}</style>

      <div className="relative flex flex-col items-center pb-1 pt-4">
        {/* Ambient radial glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: "280px",
            background:
              "radial-gradient(ellipse 55% 55% at 50% 0%, rgba(0,230,118,0.055) 0%, transparent 100%)",
          }}
        />

        {/* Avatar node */}
        <div className="relative z-10" style={{ width: 148, height: 148 }}>
          {/* Outer slow ring */}
          <div
            className="ring-b absolute rounded-full border border-[#00E676]/15"
            style={{ inset: -30 }}
          />
          {/* Inner ring */}
          <div
            className="ring-a absolute rounded-full border border-[#00E676]/25"
            style={{ inset: -15 }}
          />

          {/* Avatar image container */}
          <div
            className="relative h-full w-full overflow-hidden rounded-full bg-[#191919]"
            style={{
              boxShadow:
                "0 0 0 1.5px rgba(0,230,118,0.35), 0 0 32px rgba(0,230,118,0.1), 0 0 80px rgba(0,230,118,0.05)",
            }}
          >
            {avatar?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar.imageUrl}
                alt={avatar.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-14 w-14 text-[#00E676]/25" strokeWidth={1} />
              </div>
            )}
          </div>
        </div>

        {/* Avatar identity */}
        <div
          className="relative z-10 mt-5 text-center"
          style={{ animation: "fadeUp 0.5s 0.15s both" }}
        >
          <h2 className="font-display text-[22px] font-bold tracking-wide text-foreground">
            {avatar?.name ?? "No Avatar Selected"}
          </h2>
          <p className="mt-1 font-mono-data text-[10px] uppercase tracking-widest text-[#00E676]/60">
            {avatar ? "● Avatar Active" : "○ Avatar Pending"}
          </p>
        </div>

        {/* Pipeline progress bar */}
        <div
          className="relative z-10 mt-6 w-full max-w-[280px]"
          style={{ animation: "fadeUp 0.5s 0.25s both" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground">
              Pipeline Progress
            </span>
            <span className="font-mono-data text-[9px] tabular-nums text-[#00E676]">
              {completedCount}&thinsp;/&thinsp;{totalStages} stages
            </span>
          </div>
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-[#00E676] transition-all duration-[1100ms] ease-out"
              style={{
                width: mounted ? `${pct}%` : "0%",
                boxShadow: "0 0 8px rgba(0,230,118,0.6)",
              }}
            />
          </div>
        </div>

        {/* Connector line to pipeline grid */}
        <div
          className="relative z-10 mt-5 w-px rounded-full bg-gradient-to-b from-[#00E676]/35 to-transparent"
          style={{ animation: "connectorDraw 0.4s 0.55s both" }}
        />
      </div>
    </>
  );
}
