"use client";

import { useState, useTransition } from "react";
import { Film, Save, AlertCircle, ChevronDown, CheckCircle2, Circle, UserCircle, RefreshCw, Copy, Check, Download, Images, FolderDown, Video, Sparkles, Plus, X, Users } from "lucide-react";
import { useRef, useEffect } from "react";
import type { Script, VisualPlan } from "@/types";
import type { Avatar } from "@/types/avatar";
import type { SceneCard } from "@/types/scene";
import type { GeneratedAsset } from "@/lib/repositories/visual-plan-repo";
import type { CampaignCharacter } from "@/types/campaign-character";
import { SceneCardItem } from "./scene-card";
import { generateVisualPlanAction, saveVisualPlanAction, generateMoreBRollAction } from "@/app/actions/visual-plan";
import { createCharacterAction, deleteCharacterAction } from "@/app/actions/campaign-characters";
import { AvatarPickerModal } from "@/components/avatars/avatar-picker-modal";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "@/components/ui/provider-badge";

interface VisualPlanPanelProps {
  campaignId: string;
  scripts: Script[];
  initialPlan: VisualPlan | null;
  initialScriptId: string | null;
  initialAvatar?: Avatar | null;
  initialAssets?: GeneratedAsset[];
  initialCharacters?: CampaignCharacter[];
}

export function VisualPlanPanel({
  campaignId,
  scripts,
  initialPlan,
  initialScriptId,
  initialAvatar,
  initialAssets = [],
  initialCharacters = [],
}: VisualPlanPanelProps) {
  const [avatar, setAvatar] = useState<Avatar | null>(initialAvatar ?? null);
  const [characters, setCharacters] = useState<CampaignCharacter[]>(initialCharacters);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scriptId, setScriptId] = useState<string | null>(initialScriptId);
  const [plan, setPlan] = useState<VisualPlan | null>(initialPlan);

  // Editable top-level fields
  const [overallDirection, setOverallDirection] = useState(initialPlan?.overallDirection ?? "");
  const [baseLayer, setBaseLayer] = useState(initialPlan?.baseLayer ?? "");
  const [scenes, setScenes] = useState<SceneCard[]>(initialPlan?.sceneBreakdown ?? []);

  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const [generating, startGenerating] = useTransition();
  const [saving, startSaving] = useTransition();
  const [assets, setAssets] = useState<GeneratedAsset[]>(initialAssets);
  const [generatingMoreBRoll, setGeneratingMoreBRoll] = useState(false);

  const loading = generating || saving || generatingMoreBRoll;

  function handleScriptChange(id: string) {
    setScriptId(id);
    setPlan(null);
    setScenes([]);
    setOverallDirection("");
    setBaseLayer("");
    setIsDirty(false);
    setError(null);
    setSaveStatus("idle");
  }

  function handleGenerate() {
    if (!scriptId) return;
    setError(null);
    setSaveStatus("idle");
    startGenerating(async () => {
      const result = await generateVisualPlanAction(campaignId, scriptId);
      if (result.success) {
        setPlan(result.plan);
        setOverallDirection(result.plan.overallDirection ?? "");
        setBaseLayer(result.plan.baseLayer ?? "");
        setScenes(result.plan.sceneBreakdown ?? []);
        setIsDirty(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSceneChange(updated: SceneCard) {
    const prevScene = scenes.find(s => s.sceneNumber === updated.sceneNumber);
    const newScenes = scenes.map((s) => (s.sceneNumber === updated.sceneNumber ? updated : s));
    setScenes(newScenes);
    setIsDirty(true);
    setSaveStatus("idle");

    // Auto-save + add to assets when a new generated image URL lands
    if (
      updated.generatedImageUrl &&
      updated.generatedImageUrl !== prevScene?.generatedImageUrl &&
      scriptId && plan
    ) {
      void saveVisualPlanAction(campaignId, scriptId, overallDirection, baseLayer, plan.aRoll ?? [], plan.bRoll ?? [], newScenes);
      setAssets(a => {
        const existing = a.find(x => x.planId === plan.id && x.sceneNumber === updated.sceneNumber);
        return [
          {
            planId: plan.id,
            sceneNumber: updated.sceneNumber,
            sceneType: updated.sceneType,
            shotIdea: updated.shotIdea,
            imageUrl: updated.generatedImageUrl!,
            videoUrl: existing?.videoUrl ?? updated.generatedVideoUrl ?? null,
            imagePrompt: updated.imagePrompt,
            klingPrompt: updated.klingPrompt,
            createdAt: new Date().toISOString(),
          },
          ...a.filter(x => !(x.planId === plan.id && x.sceneNumber === updated.sceneNumber)),
        ];
      });
    }

    // Auto-save + update asset when a new generated video URL lands
    if (
      updated.generatedVideoUrl &&
      updated.generatedVideoUrl !== prevScene?.generatedVideoUrl &&
      scriptId && plan
    ) {
      void saveVisualPlanAction(campaignId, scriptId, overallDirection, baseLayer, plan.aRoll ?? [], plan.bRoll ?? [], newScenes);
      setAssets(a => a.map(x =>
        x.planId === plan.id && x.sceneNumber === updated.sceneNumber
          ? { ...x, videoUrl: updated.generatedVideoUrl! }
          : x
      ));
    }
  }

  function handleSave() {
    if (!scriptId || !plan) return;
    setError(null);
    startSaving(async () => {
      const result = await saveVisualPlanAction(
        campaignId,
        scriptId,
        overallDirection,
        baseLayer,
        plan.aRoll ?? [],
        plan.bRoll ?? [],
        scenes
      );
      if (result.success) {
        setIsDirty(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setError(result.error);
      }
    });
  }

  async function handleGenerateMoreBRoll() {
    if (!scriptId || generatingMoreBRoll) return;
    setGeneratingMoreBRoll(true);
    const result = await generateMoreBRollAction(campaignId, scriptId);
    setGeneratingMoreBRoll(false);
    if (result.success) {
      const newPlan = result.data.plan;
      setPlan(newPlan);
      setScenes(prev => {
        const existingNums = new Set(prev.map(s => s.sceneNumber));
        const brandNewScenes = (newPlan.sceneBreakdown ?? []).filter(s => !existingNums.has(s.sceneNumber));
        return [...prev, ...brandNewScenes];
      });
      setIsDirty(false);
    } else {
      setError(result.error);
    }
  }

  const hasPlan = scenes.length > 0;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Left assets column ──────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r flex flex-col overflow-hidden bg-muted/20">
        <div className="px-3 py-3 border-b shrink-0 flex items-center gap-2">
          <Images className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Assets {assets.length > 0 && `· ${assets.length}`}
          </span>
          {assets.length > 0 && (
            <DownloadAllButton assets={assets} campaignId={campaignId} />
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {assets.length === 0 ? (
            <p className="p-4 text-[11px] text-muted-foreground/40 leading-relaxed">
              Generated images will appear here automatically.
            </p>
          ) : (
            assets.map((asset) => (
              <AssetTile key={`${asset.planId}-${asset.sceneNumber}`} asset={asset} />
            ))
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-6">
          {scripts.length === 0 ? (
            <EmptyState
              icon={Film}
              title="No scripts yet"
              description="Generate a script on the Script tab first, then come back to build the visual plan."
            />
          ) : (
            <>
              {/* Script selector + generate */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Source Script
                  </label>
                  <ProviderBadge provider="openai" />
                  <div className="ml-auto">
                    {avatar ? (
                      <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 pl-0.5 pr-2 py-0.5 hover:border-primary/40 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={avatar.imageUrls[0]} alt="Avatar" className="h-5 w-5 rounded-full object-cover" />
                        <span className="text-[10px] font-medium text-muted-foreground">{avatar.name}</span>
                        <RefreshCw className="h-2.5 w-2.5 text-muted-foreground" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                      >
                        <UserCircle className="h-3 w-3" />
                        Attach Avatar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ScriptPicker
                      scripts={scripts}
                      selectedId={scriptId}
                      onSelect={handleScriptChange}
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!scriptId || loading}
                    onClick={handleGenerate}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    )}
                  >
                    <Film className={cn("h-4 w-4", generating && "animate-pulse")} />
                    {generating ? "Generating…" : hasPlan ? "Regenerate" : "Generate Visual Plan"}
                  </button>
                </div>
              </section>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Generating skeleton */}
              {generating && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-16 rounded-lg bg-muted" />
                  <div className="h-16 rounded-lg bg-muted" />
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-muted" />
                  ))}
                </div>
              )}

              {/* Plan content */}
              {hasPlan && !generating && (
                <>
                  {/* Direction + base layer */}
                  <section className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Overall Visual Direction
                      </label>
                      <textarea
                        value={overallDirection}
                        rows={5}
                        onChange={(e) => { setOverallDirection(e.target.value); setIsDirty(true); setSaveStatus("idle"); }}
                        className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Base Layer & Production Notes
                      </label>
                      <textarea
                        value={baseLayer}
                        rows={5}
                        onChange={(e) => { setBaseLayer(e.target.value); setIsDirty(true); setSaveStatus("idle"); }}
                        className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      />
                    </div>
                  </section>

                  {/* A/B roll idea lists */}
                  {(plan?.aRoll?.length || plan?.bRoll?.length) && (
                    <section className="grid grid-cols-2 gap-4">
                      {plan.aRoll && plan.aRoll.length > 0 && (
                        <IdeaList label="A-Roll Ideas" items={plan.aRoll} accentColor="blue" />
                      )}
                      {plan.bRoll && plan.bRoll.length > 0 && (
                        <IdeaList
                          label="B-Roll Ideas"
                          items={plan.bRoll}
                          accentColor="amber"
                          onGenerate={handleGenerateMoreBRoll}
                          generating={generatingMoreBRoll}
                        />
                      )}
                    </section>
                  )}

                  {/* Supporting characters roster */}
                  <CharacterRoster
                    campaignId={campaignId}
                    characters={characters}
                    onCharactersChange={setCharacters}
                  />

                  {/* Scene breakdown */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Scene Breakdown — {scenes.length} scenes
                      </p>
                      <ExpandAllButton scenes={scenes} />
                    </div>
                    <div className="space-y-2">
                      {scenes.map((scene) => (
                        <SceneCardItem
                          key={scene.sceneNumber}
                          scene={scene}
                          onChange={handleSceneChange}
                          campaignId={campaignId}
                          avatarId={avatar?.id ?? null}
                          characters={characters}
                        />
                      ))}
                    </div>
                  </section>

                  {/* Save bar */}
                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-xs text-muted-foreground">
                      {saveStatus === "saved"
                        ? "Saved!"
                        : isDirty
                        ? "Unsaved changes"
                        : "No unsaved changes"}
                    </span>
                    <button
                      type="button"
                      disabled={!isDirty || loading}
                      onClick={handleSave}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium",
                        "hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      )}
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving…" : "Save All Changes"}
                    </button>
                  </div>
                </>
              )}

              {/* Empty states */}
              {!hasPlan && !generating && scriptId && (
                <EmptyState
                  icon={Film}
                  title="Ready to generate"
                  description='Click "Generate Visual Plan" to build a scene-by-scene visual direction from this script.'
                />
              )}
              {!hasPlan && !generating && !scriptId && (
                <EmptyState
                  icon={Film}
                  title="Select a script above"
                  description="Choose which script to build the visual plan from."
                />
              )}
            </>
          )}

          {pickerOpen && (
            <AvatarPickerModal
              campaignId={campaignId}
              currentAvatarId={avatar?.id ?? null}
              onClose={() => setPickerOpen(false)}
              onAttached={(newAvatar) => setAvatar(newAvatar)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Character roster ───────────────────────────────────────────────────────

function CharacterRoster({
  campaignId,
  characters,
  onCharactersChange,
}: {
  campaignId: string;
  characters: CampaignCharacter[];
  onCharactersChange: (chars: CampaignCharacter[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{ base64: string; mimeType: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      setPendingFile({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      setPreviewUrl(dataUrl);
    };
    img.src = objectUrl;
    e.target.value = "";
  }

  async function handleAdd() {
    if (!name.trim() || !pendingFile) return;
    setUploading(true);
    setUploadError(null);
    const result = await createCharacterAction(campaignId, name.trim(), pendingFile.base64, pendingFile.mimeType);
    setUploading(false);
    if (result.success) {
      onCharactersChange([...characters, result.data.character]);
      setAdding(false);
      setName("");
      setPendingFile(null);
      setPreviewUrl(null);
    } else {
      setUploadError(result.error);
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteCharacterAction(id, campaignId);
    if (result.success) {
      onCharactersChange(characters.filter((c) => c.id !== id));
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Supporting Characters
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {/* Existing characters */}
      {characters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {characters.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-white/8 bg-[#0d0d0d] px-2 py-1.5"
            >
              {c.referenceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.referenceImageUrl}
                  alt={c.name}
                  className="h-7 w-7 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 border border-white/10">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-xs font-medium text-foreground/80">{c.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="ml-1 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove ${c.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-lg border border-white/8 bg-[#0d0d0d] p-3 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            New Character
          </p>
          <input
            type="text"
            placeholder="Name (e.g. Husband, Daughter)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {previewUrl ? "Change Photo" : "Upload Photo"}
            </button>
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="h-8 w-8 rounded-full object-cover border border-white/10" />
            )}
          </div>
          {uploadError && <p className="text-[11px] text-destructive">{uploadError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!name.trim() || !pendingFile || uploading}
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {uploading ? "Saving…" : "Save Character"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setName(""); setPendingFile(null); setPreviewUrl(null); setUploadError(null); }}
              className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {characters.length === 0 && !adding && (
        <p className="text-[11px] text-muted-foreground/40">
          Add reference photos for people mentioned in scenes (husband, daughter, etc.) so Gemini can reproduce their likeness.
        </p>
      )}
    </section>
  );
}

// ── Idea list ──────────────────────────────────────────────────────────────

function IdeaList({
  label,
  items,
  accentColor,
  onGenerate,
  generating,
}: {
  label: string;
  items: string[];
  accentColor: "blue" | "amber";
  onGenerate?: () => void;
  generating?: boolean;
}) {
  const dot = accentColor === "blue" ? "bg-blue-400" : "bg-amber-400";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className={cn("h-2.5 w-2.5", generating && "animate-pulse")} />
            {generating ? "Generating…" : "Generate More"}
          </button>
        )}
      </div>
      <ul className="space-y-1 rounded-md border bg-muted/20 px-3 py-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Expand all button ──────────────────────────────────────────────────────
// Note: scene cards manage their own open state; this is a hint to the user.

function ExpandAllButton({ scenes }: { scenes: SceneCard[] }) {
  return (
    <span className="text-xs text-muted-foreground">
      Click a scene to edit — {scenes.filter((s) => s.sceneType === "A-roll").length} A-roll ·{" "}
      {scenes.filter((s) => s.sceneType === "B-roll").length} B-roll
    </span>
  );
}

// ── Script picker ──────────────────────────────────────────────────────────

interface ScriptPickerProps {
  scripts: Script[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

function ScriptPicker({ scripts, selectedId, onSelect, disabled }: ScriptPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = scripts.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? (selected.versionName ?? `Script ${selected.id.slice(-6)}`) : "Select a script…"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="py-1">
            {scripts.map((script) => (
              <li key={script.id}>
                <button
                  type="button"
                  onClick={() => { onSelect(script.id); setOpen(false); }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent",
                    script.id === selectedId && "bg-accent/50"
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {script.id === selectedId
                      ? <CheckCircle2 className="h-4 w-4 text-primary" />
                      : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium">{script.versionName ?? `Script ${script.id.slice(-6)}`}</span>
                    {script.hook && (
                      <span className="line-clamp-1 text-xs text-muted-foreground">{script.hook}</span>
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

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <Icon className="mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ── Asset panel components ──────────────────────────────────────────────────

function AssetTile({ asset }: { asset: GeneratedAsset }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="relative mb-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.imageUrl}
            alt={asset.shotIdea}
            className="w-full aspect-video object-cover rounded border border-border"
          />
          {asset.videoUrl && (
            <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-semibold text-white">
              <Video className="h-2.5 w-2.5" /> Video
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-[9px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded",
            asset.sceneType === "A-roll"
              ? "bg-blue-50 text-blue-600 border border-blue-200"
              : "bg-amber-50 text-amber-600 border border-amber-200"
          )}>
            {asset.sceneType}
          </span>
          <p className="text-[10px] text-muted-foreground truncate flex-1">
            {asset.sceneNumber}. {asset.shotIdea}
          </p>
        </div>
      </button>
      {open && (
        <div className="px-2.5 pb-3 space-y-2">
          <AssetPromptBlock label="Image Prompt" value={asset.imagePrompt} />
          <AssetPromptBlock label="Kling 3.0 Prompt" value={asset.klingPrompt} />
          <div className="flex items-center gap-1.5">
            <AssetDownloadButton url={asset.imageUrl} filename={`scene-${asset.sceneNumber}.jpg`} label="Image" />
            {asset.videoUrl && (
              <AssetDownloadButton url={asset.videoUrl} filename={`scene-${asset.sceneNumber}-talking.mp4`} label="Video" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadAllButton({ assets, campaignId }: { assets: GeneratedAsset[]; campaignId: string }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadAll() {
    if (downloading) return;
    setDownloading(true);
    for (const asset of assets) {
      const urls: Array<{ url: string; filename: string }> = [
        { url: asset.imageUrl, filename: `campaign-${campaignId}-scene-${asset.sceneNumber}.jpg` },
      ];
      if (asset.videoUrl) {
        urls.push({ url: asset.videoUrl, filename: `campaign-${campaignId}-scene-${asset.sceneNumber}-talking.mp4` });
      }
      for (const { url, filename } of urls) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);
          // Small delay between downloads to avoid browser throttling
          await new Promise<void>((r) => setTimeout(r, 400));
        } catch { /* skip failed downloads */ }
      }
    }
    setDownloading(false);
  }

  return (
    <button
      type="button"
      onClick={handleDownloadAll}
      disabled={downloading}
      title="Download all assets"
      className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
    >
      <FolderDown className="h-3 w-3" />
      {downloading ? "…" : "All"}
    </button>
  );
}

function AssetPromptBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium transition-colors",
            copied ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-4">{value}</p>
    </div>
  );
}

function AssetDownloadButton({ url, filename, label = "Download" }: { url: string; filename: string; label?: string }) {
  async function handleDownload() {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch { /* silently fail */ }
  }
  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
    >
      <Download className="h-3 w-3" />
      {label}
    </button>
  );
}
