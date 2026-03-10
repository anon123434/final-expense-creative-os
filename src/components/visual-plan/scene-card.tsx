"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Clapperboard, Camera, Sparkles, Download, UserCircle, FileImage, Mic, Video } from "lucide-react";
import type { SceneCard } from "@/types/scene";
import { cn } from "@/lib/utils";
import { generateSceneImageAction, uploadDocumentAssetAction, generateTalkingVideoAction, checkVideoStatusAction } from "@/app/actions/visual-plan";

interface SceneCardProps {
  scene: SceneCard;
  onChange: (updated: SceneCard) => void;
  campaignId: string;
  avatarId?: string | null;
}

type EditableField = keyof Omit<SceneCard, "sceneNumber" | "sceneType" | "useAvatarReference" | "generatedImageUrl">;

export function SceneCardItem({ scene, onChange, campaignId, avatarId }: SceneCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoElapsed, setVideoElapsed] = useState(0);
  const [pollingVideoId, setPollingVideoId] = useState<string | null>(scene.videoJobId ?? null);

  const sceneRef = useRef(scene);
  const onChangeRef = useRef(onChange);
  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  function update(field: EditableField, value: string) {
    onChange({ ...scene, [field]: value });
  }

  function toggleType() {
    onChange({ ...scene, sceneType: scene.sceneType === "A-roll" ? "B-roll" : "A-roll" });
  }

  async function handleGenerateImage() {
    if (!scene.imagePrompt || generatingImage) return;
    setGeneratingImage(true);
    setImageError(null);
    setElapsed(0);
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    const useRef = scene.useAvatarReference !== false; // default true
    const result = await generateSceneImageAction(
      campaignId,
      scene.sceneNumber,
      scene.imagePrompt,
      useRef ? avatarId : null,
      scene.documentReferenceUrl ?? null
    );
    clearInterval(timer);
    setGeneratingImage(false);
    if (result.success) {
      onChange({ ...scene, generatedImageUrl: result.data.url });
    } else {
      setImageError(result.error);
    }
  }

  async function handleDownload() {
    if (!scene.generatedImageUrl) return;
    try {
      const res = await fetch(scene.generatedImageUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `scene-${scene.sceneNumber}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // silently fail — image is still viewable
    }
  }

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setDocUploadError(null);
    try {
      // Compress image client-side to stay under the 1MB server action body limit
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const MAX = 1200;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
          resolve(dataUrl.split(",")[1]);
        };
        img.onerror = reject;
        img.src = objectUrl;
      });
      const result = await uploadDocumentAssetAction(base64, "image/jpeg", campaignId, scene.sceneNumber);
      if (result.success) {
        onChange({ ...scene, documentReferenceUrl: result.data.url, useDocumentReference: true });
      } else {
        setDocUploadError(result.error);
      }
    } catch (err) {
      setDocUploadError("Failed to upload document.");
      console.error("handleDocumentUpload:", err);
    } finally {
      setUploadingDoc(false);
      // Reset file input so the same file can be re-uploaded
      e.target.value = "";
    }
  }

  function handleAudioSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAudioBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleGenerateVideo() {
    if (!scene.generatedImageUrl || !audioBase64 || !audioFile || generatingVideo) return;
    setGeneratingVideo(true);
    setVideoError(null);
    setVideoElapsed(0);
    const start = Date.now();
    const timer = setInterval(() => setVideoElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    try {
      const result = await generateTalkingVideoAction(
        campaignId,
        scene.sceneNumber,
        scene.generatedImageUrl,
        audioBase64,
        audioFile.type || "audio/mpeg"
      );
      if (!result.success) {
        setGeneratingVideo(false);
        setVideoError(result.error);
        return;
      }
      // Store jobId on scene and start polling
      onChange({ ...scene, videoJobId: result.data.videoId });
      setPollingVideoId(result.data.videoId);
      // generatingVideo stays true; polling useEffect will clear it when done
    } finally {
      clearInterval(timer);
    }
  }

  async function handleVideoDownload() {
    if (!scene.generatedVideoUrl) return;
    try {
      const res = await fetch(scene.generatedVideoUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `scene-${scene.sceneNumber}-talking.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    if (!pollingVideoId || sceneRef.current.generatedVideoUrl) return;
    let cancelled = false;

    const elapsedInterval = setInterval(
      () => setVideoElapsed((v) => v + 1),
      1000
    );

    const poll = async () => {
      while (!cancelled) {
        await new Promise<void>((r) => setTimeout(r, 5000));
        if (cancelled) break;
        const result = await checkVideoStatusAction(pollingVideoId);
        if (!result.success) {
          setVideoError(result.error);
          setGeneratingVideo(false);
          setVideoElapsed(0);
          break;
        }
        const { status, videoUrl } = result.data;
        if (status === "completed" && videoUrl) {
          onChangeRef.current({ ...sceneRef.current, generatedVideoUrl: videoUrl, videoJobId: pollingVideoId });
          setGeneratingVideo(false);
          setPollingVideoId(null);
          setVideoElapsed(0);
          break;
        }
        if (status === "failed") {
          setVideoError("Video generation failed on HeyGen.");
          setGeneratingVideo(false);
          setVideoElapsed(0);
          break;
        }
        // pending/processing — loop continues
      }
    };

    setGeneratingVideo(true);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(elapsedInterval);
    };
  }, [pollingVideoId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn(
      "rounded-lg border bg-background transition-shadow",
      expanded && "shadow-sm"
    )}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 px-4 py-3 text-left"
      >
        {/* Scene number badge */}
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
          {scene.sceneNumber}
        </span>

        {/* Type chip */}
        <span
          onClick={(e) => { e.stopPropagation(); toggleType(); }}
          className={cn(
            "mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none",
            scene.sceneType === "A-roll"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          )}
        >
          {scene.sceneType === "A-roll" ? (
            <Camera className="h-2.5 w-2.5" />
          ) : (
            <Clapperboard className="h-2.5 w-2.5" />
          )}
          {scene.sceneType}
        </span>

        {/* Shot idea summary */}
        <span className="flex-1 text-sm">
          <span className="font-medium">{scene.shotIdea || "Untitled scene"}</span>
          {scene.lineReference && (
            <span className="ml-2 text-xs text-muted-foreground italic">
              "{scene.lineReference}"
            </span>
          )}
        </span>

        {/* Avatar reference indicator */}
        {avatarId && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange({ ...scene, useAvatarReference: scene.useAvatarReference === false ? true : false });
            }}
            title={scene.useAvatarReference === false ? "Avatar reference off — click to enable" : "Avatar reference on — click to disable"}
            className={cn(
              "mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer select-none transition-colors",
              scene.useAvatarReference === false
                ? "bg-muted text-muted-foreground border border-border"
                : "bg-violet-50 text-violet-700 border border-violet-200"
            )}
          >
            <UserCircle className="h-2.5 w-2.5" />
            {scene.useAvatarReference === false ? "No avatar" : "Avatar ref"}
          </span>
        )}

        {/* Document reference indicator */}
        {scene.useDocumentReference && (
          <span
            className="mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold select-none bg-amber-50 text-amber-700 border border-amber-200"
            title={scene.documentReferenceUrl ? "Document reference attached" : "Document reference — upload a file in the scene editor"}
          >
            <FileImage className="h-2.5 w-2.5" />
            {scene.documentReferenceUrl ? "Doc ref" : "No doc"}
          </span>
        )}

        {/* Generated image thumbnail in header */}
        {scene.generatedImageUrl && !expanded && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={scene.generatedImageUrl}
            alt="Generated"
            className="h-8 w-14 rounded object-cover border border-border shrink-0"
          />
        )}

        {/* Expand chevron */}
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SceneField
              label="Line Reference"
              value={scene.lineReference}
              onChange={(v) => update("lineReference", v)}
              rows={2}
            />
            <SceneField
              label="Setting"
              value={scene.setting}
              onChange={(v) => update("setting", v)}
              rows={2}
            />
            <SceneField
              label="Shot Idea"
              value={scene.shotIdea}
              onChange={(v) => update("shotIdea", v)}
              rows={2}
            />
            <SceneField
              label="Emotion"
              value={scene.emotion}
              onChange={(v) => update("emotion", v)}
              rows={2}
            />
            <SceneField
              label="Camera Style"
              value={scene.cameraStyle}
              onChange={(v) => update("cameraStyle", v)}
              rows={2}
            />
          </div>

          {/* Image prompt + generate */}
          <CopyableField
            label="Image Prompt"
            value={scene.imagePrompt}
            onChange={(v) => update("imagePrompt", v)}
            rows={3}
            accentColor="violet"
          />

          {/* Document asset attachment */}
          {scene.useDocumentReference && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Document Reference
                </span>
                <label
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium cursor-pointer transition-colors",
                    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
                    uploadingDoc && "opacity-50 pointer-events-none"
                  )}
                >
                  <FileImage className="h-3 w-3" />
                  {uploadingDoc ? "Uploading…" : scene.documentReferenceUrl ? "Replace" : "Attach file"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleDocumentUpload}
                    disabled={uploadingDoc}
                  />
                </label>
              </div>
              {docUploadError && (
                <p className="text-xs text-destructive">{docUploadError}</p>
              )}
              {scene.documentReferenceUrl && (
                <div className="flex items-center gap-2 rounded-md border border-amber-100 bg-amber-50/50 px-2.5 py-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scene.documentReferenceUrl}
                    alt="Document reference"
                    className="h-10 w-16 rounded object-cover border border-amber-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-amber-700 truncate">Document attached</p>
                    <p className="text-[10px] text-muted-foreground truncate">{scene.documentReferenceUrl.split("/").pop()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ ...scene, documentReferenceUrl: null })}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Remove document reference"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Generated image or generate button */}
          <div className="space-y-2">
            {scene.generatedImageUrl ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Generated Image
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      {generatingImage ? "Regenerating…" : "Regenerate"}
                    </button>
                  </div>
                </div>
                <div className="group relative aspect-video w-full overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scene.generatedImageUrl}
                    alt={`Scene ${scene.sceneNumber}`}
                    className={cn("h-full w-full object-cover transition-opacity", generatingImage && "opacity-40")}
                  />
                  {generatingImage ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
                      <Sparkles className="h-5 w-5 animate-pulse text-violet-500" />
                      <span className="text-xs font-medium text-violet-700">{elapsed}s</span>
                      <div className="w-32 h-1 rounded-full bg-violet-100 overflow-hidden">
                        <div
                          className="h-full bg-violet-400 rounded-full"
                          style={{
                            width: `${Math.min(90, (elapsed / 30) * 90)}%`,
                            transition: "width 0.5s ease-out",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      title="Download image"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {imageError && (
                  <p className="text-xs text-destructive">{imageError}</p>
                )}
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || !scene.imagePrompt}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-4 text-sm font-medium transition-colors overflow-hidden",
                    "border-violet-200 text-violet-600 hover:bg-violet-50/50 hover:border-violet-300",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className={cn("h-4 w-4", generatingImage && "animate-pulse")} />
                    {generatingImage ? `Generating image… ${elapsed}s` : "Generate Image"}
                    {avatarId && !generatingImage && scene.useAvatarReference !== false && (
                      <span className="text-[10px] text-violet-400 font-normal">· using avatar reference</span>
                    )}
                  </span>
                  {generatingImage && (
                    <div className="w-48 h-1 rounded-full bg-violet-100 overflow-hidden">
                      <div
                        className="h-full bg-violet-400 rounded-full"
                        style={{
                          width: `${Math.min(90, (elapsed / 30) * 90)}%`,
                          transition: "width 0.5s ease-out",
                        }}
                      />
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Talking Video — A-roll only, requires generated image */}
          {scene.sceneType === "A-roll" && scene.generatedImageUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Talking Video
                </span>
              </div>

              {scene.generatedVideoUrl ? (
                <div className="space-y-1.5">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    src={scene.generatedVideoUrl}
                    controls
                    className="w-full rounded-lg border border-border aspect-video bg-black"
                  />
                  <button
                    type="button"
                    onClick={handleVideoDownload}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Download className="h-3 w-3" /> Download Video
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-medium cursor-pointer transition-colors",
                      audioFile
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Mic className="h-3 w-3" />
                    {audioFile ? audioFile.name : "Upload Audio File"}
                    <input
                      type="file"
                      accept="audio/*"
                      className="sr-only"
                      onChange={handleAudioSelect}
                      disabled={generatingVideo}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateVideo}
                    disabled={!audioBase64 || generatingVideo || pollingVideoId !== null}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-xs font-medium transition-colors",
                      "border-rose-200 text-rose-600 hover:bg-rose-50/50 hover:border-rose-300",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <Video className={cn("h-4 w-4", generatingVideo && "animate-pulse")} />
                    {generatingVideo ? `Generating… ${videoElapsed}s` : "Generate Talking Video"}
                  </button>

                  {videoError && <p className="text-xs text-destructive">{videoError}</p>}
                </div>
              )}
            </div>
          )}

          {/* Kling prompt */}
          <CopyableField
            label="Kling 3.0 Video Prompt"
            value={scene.klingPrompt}
            onChange={(v) => update("klingPrompt", v)}
            rows={4}
            accentColor="sky"
          />
        </div>
      )}
    </div>
  );
}

// ── Internal components ────────────────────────────────────────────────────

interface SceneFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

function SceneField({ label, value, onChange, rows = 2 }: SceneFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={cn(
          "w-full resize-none rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs leading-relaxed",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        )}
      />
    </div>
  );
}

interface CopyableFieldProps extends SceneFieldProps {
  accentColor: "violet" | "sky";
}

function CopyableField({ label, value, onChange, rows, accentColor }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const accentClass = accentColor === "violet"
    ? "text-violet-600 border-violet-200 bg-violet-50"
    : "text-sky-600 border-sky-200 bg-sky-50";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
            copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : accentClass
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-md border px-2.5 py-1.5 text-xs leading-relaxed",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          accentColor === "violet"
            ? "border-violet-100 bg-violet-50/50 focus:ring-violet-400"
            : "border-sky-100 bg-sky-50/50 focus:ring-sky-400"
        )}
      />
    </div>
  );
}
