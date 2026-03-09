"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { AvatarControls } from "./avatar-controls";
import { AvatarResults } from "./avatar-results";
import { AvatarLibrary } from "./avatar-library";
import { generateAvatarAction } from "@/app/actions/avatars";
import type { Avatar, AvatarMode, AspectRatio } from "@/types/avatar";

interface AvatarStudioProps {
  initialAvatars: Avatar[];
}

export function AvatarStudio({ initialAvatars }: AvatarStudioProps) {
  const [prompt, setPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [mode, setMode] = useState<AvatarMode>("likeness_only");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  const [generatedAvatar, setGeneratedAvatar] = useState<Avatar | null>(null);
  const [usedMock, setUsedMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pendingName, setPendingName] = useState("");
  const [saving, startSaving] = useTransition();

  const [avatars, setAvatars] = useState<Avatar[]>(initialAvatars);

  // Start/stop the elapsed timer based on generating state
  useEffect(() => {
    if (generating) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generating]);

  function handleGenerate() {
    if (!prompt.trim()) return;
    setError(null);
    setGeneratedAvatar(null);

    const defaultName = `Avatar · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    setPendingName(defaultName);

    startGenerating(async () => {
      const result = await generateAvatarAction({
        prompt,
        mode,
        aspectRatio,
        referenceImageBase64: referenceImage,
        name: defaultName,
      });

      if (result.success) {
        setGeneratedAvatar(result.data.avatar);
        setUsedMock(result.data.usedMock);
        setAvatars((prev) => [result.data.avatar, ...prev]);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSave() {
    if (!generatedAvatar || !pendingName.trim()) return;
    startSaving(async () => {
      setGeneratedAvatar(null);
      setPendingName("");
    });
  }

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Left panel */}
      <div className="w-[420px] shrink-0 overflow-y-auto border-r p-6">
        <AvatarControls
          prompt={prompt}
          onPromptChange={setPrompt}
          referenceImage={referenceImage}
          onReferenceImageChange={setReferenceImage}
          mode={mode}
          onModeChange={setMode}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          onGenerate={handleGenerate}
          generating={generating}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <AvatarResults
          generating={generating}
          elapsedSeconds={elapsedSeconds}
          mode={mode}
          generatedAvatar={generatedAvatar}
          error={error}
          pendingName={pendingName}
          onPendingNameChange={setPendingName}
          onSave={handleSave}
          saving={saving}
          usedMock={usedMock}
        />

        {avatars.length > 0 && (
          <div className="border-t pt-6">
            <AvatarLibrary
              avatars={avatars}
              onAvatarsChange={setAvatars}
            />
          </div>
        )}
      </div>
    </div>
  );
}
