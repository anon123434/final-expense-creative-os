# Avatar Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a global `/avatars` studio where users upload a reference image + write a prompt, choose Likeness Only (4-image character sheet) or Likeness + Environment mode, generate images via Gemini, save them to Supabase Storage, and optionally attach one avatar per campaign.

**Architecture:** Split-panel page at `/avatars` (left controls, right results+library). OpenAI GPT-4o expands user prompts into structured Gemini prompts. Gemini `gemini-2.5-flash-image` generates 4 images in parallel. Images stored in Supabase Storage `avatars` bucket; metadata in new `avatars` table. Campaigns get an `avatar_id` FK for the Active Avatar section on the Overview tab.

**Tech Stack:** Next.js 16 App Router · Server Actions · Supabase (Postgres + Storage) · OpenAI SDK (already installed) · Gemini REST API (fetch, no extra SDK) · Tailwind CSS · lucide-react · useTransition for async UI state

---

## Task 1: Database migration — avatars table + campaign FK

**Files:**
- Create: `supabase/20260309_add_avatars.sql`
- Modify: `supabase/schema.sql`

**Step 1: Write the migration file**

```sql
-- supabase/20260309_add_avatars.sql

-- Create avatars bucket (run once in Supabase dashboard if not via SQL)
-- Storage: create bucket named "avatars" with public access in Supabase UI

-- Avatars table
create table if not exists avatars (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  name                text not null default '',
  prompt              text not null,
  expanded_prompt     text,
  mode                text not null check (mode in ('likeness_only', 'likeness_environment')),
  aspect_ratio        text not null default '16:9',
  reference_image_url text,
  image_urls          jsonb not null default '[]',
  created_at          timestamptz not null default now()
);

alter table avatars enable row level security;

create policy "Users can manage own avatars"
  on avatars for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_avatars_user_id on avatars (user_id);
create index if not exists idx_avatars_created_at on avatars (created_at desc);

-- Add avatar_id FK to campaigns
alter table campaigns
  add column if not exists avatar_id uuid references avatars(id) on delete set null;
```

**Step 2: Append the same to schema.sql**

Open `supabase/schema.sql` and append the exact SQL above (minus the comments about the bucket) after the last existing block. This keeps schema.sql as the single source of truth.

**Step 3: Run in Supabase dashboard**

Copy the migration SQL into the Supabase SQL Editor and execute it. Also create the `avatars` Storage bucket manually:
- Go to Storage → New bucket
- Name: `avatars`
- Public: ✅ (so image URLs are publicly readable)

**Step 4: Commit**

```bash
git add supabase/20260309_add_avatars.sql supabase/schema.sql
git commit -m "feat: add avatars table and campaign avatar_id FK"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `src/types/avatar.ts`
- Modify: `src/types/database.ts`

**Step 1: Create domain type**

```typescript
// src/types/avatar.ts

export type AvatarMode = 'likeness_only' | 'likeness_environment';
export type AspectRatio = '16:9' | '9:16';

export interface Avatar {
  id: string;
  userId: string;
  name: string;
  prompt: string;
  expandedPrompt: string | null;
  mode: AvatarMode;
  aspectRatio: AspectRatio;
  referenceImageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
}
```

**Step 2: Add database row types to database.ts**

Append to the bottom of `src/types/database.ts`:

```typescript
// ── Avatars ──────────────────────────────────────────────────────────────

export interface AvatarRow {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  expanded_prompt: string | null;
  mode: string;
  aspect_ratio: string;
  reference_image_url: string | null;
  image_urls: string[];
  created_at: string;
}

export interface AvatarInsert {
  user_id: string;
  name: string;
  prompt: string;
  expanded_prompt?: string | null;
  mode: string;
  aspect_ratio: string;
  reference_image_url?: string | null;
  image_urls?: string[];
}

export interface AvatarUpdate {
  name?: string;
  image_urls?: string[];
  avatar_id?: string | null;
}
```

Also add `avatar_id` to `CampaignRow` and `CampaignUpdate`:

```typescript
// In CampaignRow, add:
avatar_id: string | null;

// In CampaignUpdate, add:
avatar_id?: string | null;
```

**Step 3: Commit**

```bash
git add src/types/avatar.ts src/types/database.ts
git commit -m "feat: add Avatar domain type and database row types"
```

---

## Task 3: Mapper + env key resolver

**Files:**
- Modify: `src/lib/mappers.ts`
- Modify: `src/lib/config/env.ts`
- Modify: `src/components/ui/provider-badge.tsx`

**Step 1: Add toAvatar mapper to mappers.ts**

Add this import at the top of `src/lib/mappers.ts`:
```typescript
import type { AvatarRow } from "@/types/database";
import type { Avatar } from "@/types/avatar";
```

Add this function at the bottom of `src/lib/mappers.ts`:
```typescript
export function toAvatar(row: AvatarRow): Avatar {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    prompt: row.prompt,
    expandedPrompt: row.expanded_prompt,
    mode: row.mode as Avatar["mode"],
    aspectRatio: row.aspect_ratio as Avatar["aspectRatio"],
    referenceImageUrl: row.reference_image_url,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
    createdAt: row.created_at,
  };
}
```

Also update `toCampaign` to include `avatarId`:
```typescript
// In toCampaign, add after personaImageUrl line:
avatarId: row.avatar_id ?? null,
```

And add `avatarId: string | null` to the `Campaign` type in `src/types/campaign.ts`.

**Step 2: Add resolveGeminiApiKey to env.ts**

Add after the `hasOpenAIKey` block in `src/lib/config/env.ts`:

```typescript
// --- Gemini ---

export function resolveGeminiApiKey(): string | undefined {
  return getCache()?.gemini ?? readServerVar("GEMINI_API_KEY");
}

export function hasGeminiKey(): boolean {
  return !!resolveGeminiApiKey();
}
```

**Step 3: Add Gemini to ProviderBadge**

In `src/components/ui/provider-badge.tsx`, update:

```typescript
type Provider = "claude" | "openai" | "gemini";

const config: Record<Provider, { label: string; className: string }> = {
  claude: {
    label: "Claude",
    className: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  },
  openai: {
    label: "OpenAI",
    className: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  gemini: {
    label: "Gemini",
    className: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  },
};
```

**Step 4: Commit**

```bash
git add src/lib/mappers.ts src/lib/config/env.ts src/components/ui/provider-badge.tsx src/types/campaign.ts
git commit -m "feat: toAvatar mapper, resolveGeminiApiKey, Gemini provider badge"
```

---

## Task 4: Avatar repository

**Files:**
- Create: `src/lib/mock/avatar-mock.ts`
- Create: `src/lib/repositories/avatar-repo.ts`

**Step 1: Create mock store**

```typescript
// src/lib/mock/avatar-mock.ts

import type { AvatarRow } from "@/types/database";

const DEFAULT_AVATARS: AvatarRow[] = [];

type MockStore = { _mockAvatarRows?: AvatarRow[] };
const g = globalThis as typeof globalThis & MockStore;
if (!g._mockAvatarRows) g._mockAvatarRows = [...DEFAULT_AVATARS];
export const mockAvatarRows = g._mockAvatarRows;
```

**Step 2: Create repository**

```typescript
// src/lib/repositories/avatar-repo.ts

import type { Avatar } from "@/types/avatar";
import type { AvatarInsert } from "@/types/database";
import { toAvatar } from "@/lib/mappers";
import { mockAvatarRows } from "@/lib/mock/avatar-mock";
import { hasSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase/repo-helpers";

export async function getAvatarsByUser(userId: string): Promise<Avatar[]> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("avatars")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) return data.map(toAvatar);
    console.warn("Supabase getAvatarsByUser failed, using mock:", error?.message);
  }

  return mockAvatarRows.filter((r) => r.user_id === userId).map(toAvatar);
}

export async function getAvatarById(id: string): Promise<Avatar | null> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("avatars")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) return toAvatar(data);
    console.warn("Supabase getAvatarById failed, using mock:", error?.message);
  }

  const row = mockAvatarRows.find((r) => r.id === id);
  return row ? toAvatar(row) : null;
}

export async function createAvatar(data: AvatarInsert): Promise<Avatar> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("avatars")
      .insert(data)
      .select()
      .single();

    if (!error && row) return toAvatar(row);
    console.warn("Supabase createAvatar failed, using mock:", error?.message);
  }

  const row = {
    id: `avatar-${Date.now()}`,
    user_id: data.user_id,
    name: data.name,
    prompt: data.prompt,
    expanded_prompt: data.expanded_prompt ?? null,
    mode: data.mode,
    aspect_ratio: data.aspect_ratio,
    reference_image_url: data.reference_image_url ?? null,
    image_urls: data.image_urls ?? [],
    created_at: new Date().toISOString(),
  };
  mockAvatarRows.push(row);
  return toAvatar(row);
}

export async function updateAvatarImages(id: string, imageUrls: string[]): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    await supabase.from("avatars").update({ image_urls: imageUrls }).eq("id", id);
    return;
  }
  const row = mockAvatarRows.find((r) => r.id === id);
  if (row) row.image_urls = imageUrls;
}

export async function deleteAvatar(id: string): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    await supabase.from("avatars").delete().eq("id", id);
    return;
  }
  const idx = mockAvatarRows.findIndex((r) => r.id === id);
  if (idx !== -1) mockAvatarRows.splice(idx, 1);
}

export async function attachAvatarToCampaign(
  campaignId: string,
  avatarId: string | null
): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();
    await supabase
      .from("campaigns")
      .update({ avatar_id: avatarId })
      .eq("id", campaignId);
    return;
  }
  // Mock: find campaign in mock store and update (import dynamically to avoid circular)
  const { mockCampaignRows } = await import("@/lib/mock/campaigns");
  const campaign = mockCampaignRows.find((c: { id: string }) => c.id === campaignId);
  if (campaign) (campaign as Record<string, unknown>).avatar_id = avatarId;
}
```

**Step 3: Commit**

```bash
git add src/lib/mock/avatar-mock.ts src/lib/repositories/avatar-repo.ts
git commit -m "feat: avatar repository with Supabase + mock fallback"
```

---

## Task 5: Avatar generator service

**Files:**
- Create: `src/lib/services/avatar-generator.ts`

This service does two things:
1. Calls OpenAI GPT-4o to expand the user's prompt into structured Gemini prompts
2. Calls Gemini `gemini-2.5-flash-image` to generate images
3. Uploads base64 results to Supabase Storage (or returns data URLs for mock)

```typescript
// src/lib/services/avatar-generator.ts

import OpenAI from "openai";
import { resolveOpenAIApiKey, resolveGeminiApiKey, hasGeminiKey } from "@/lib/config/env";
import type { AvatarMode, AspectRatio } from "@/types/avatar";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GenerateAvatarInput {
  prompt: string;
  mode: AvatarMode;
  aspectRatio: AspectRatio;
  referenceImageBase64?: string | null; // full data URL, e.g. "data:image/jpeg;base64,..."
  avatarId: string; // pre-generated UUID for storage paths
}

export interface GeneratedImage {
  index: number;
  label: string;
  base64: string;   // raw base64 PNG data
  mimeType: string;
}

export interface GenerateAvatarResult {
  expandedPrompts: string[];
  images: (GeneratedImage | { index: number; label: string; error: string })[];
  usedMock: boolean;
}

// ── Labels ─────────────────────────────────────────────────────────────────

const LIKENESS_LABELS = ["Front", "3/4 Angle", "Side Profile", "Relaxed Pose"];
const ENVIRONMENT_LABELS = ["Scene 1", "Scene 2", "Scene 3", "Scene 4"];

// ── Mock fallback ──────────────────────────────────────────────────────────

// A 1×1 transparent PNG in base64 — used when no Gemini key is available
const MOCK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function getMockResult(mode: AvatarMode): GenerateAvatarResult {
  const labels = mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;
  return {
    expandedPrompts: labels.map((l) => `[MOCK] ${l} prompt`),
    images: labels.map((label, index) => ({
      index,
      label,
      base64: MOCK_PNG_BASE64,
      mimeType: "image/png",
    })),
    usedMock: true,
  };
}

// ── OpenAI prompt expansion ────────────────────────────────────────────────

async function expandPrompts(
  input: GenerateAvatarInput
): Promise<string[]> {
  const openaiKey = resolveOpenAIApiKey();
  if (!openaiKey) {
    const labels = input.mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;
    return labels.map((l) => `${input.prompt} — ${l}`);
  }

  const client = new OpenAI({ apiKey: openaiKey });
  const hasRef = !!input.referenceImageBase64;

  const systemPrompt = input.mode === "likeness_only"
    ? `You are an expert at writing Gemini image generation prompts for character model sheets.
Given a user's description${hasRef ? " and reference image" : ""}, produce exactly 4 prompts for a professional character sheet.
Each prompt must produce a photorealistic portrait of the SAME person:
- Prompt 1: direct front-facing headshot, plain white studio background, soft even lighting, ultra high detail
- Prompt 2: 3/4 angle from front-left, plain white studio background, same person, professional lighting
- Prompt 3: exact side profile (90 degrees), plain white studio background, same person
- Prompt 4: relaxed neutral full-body pose, plain white studio background, same person
Rules: plain white background ONLY, consistent identity across all 4, ultra-realistic, 8K quality, no props.
Return a JSON object: { "prompts": ["prompt1", "prompt2", "prompt3", "prompt4"] }`
    : `You are an expert at writing Gemini image generation prompts for photorealistic character scenes.
Given a user's description${hasRef ? " and reference image" : ""}, produce exactly 4 prompts placing the SAME character in different environments.
Each prompt must maintain strict facial and body consistency across all scenes.
Infer environments from the description or use: living room, city street, kitchen, office.
Aspect ratio: ${input.aspectRatio}. Ultra-realistic, cinematic lighting, photojournalism quality.
Return a JSON object: { "prompts": ["prompt1", "prompt2", "prompt3", "prompt4"] }`;

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];

  if (hasRef && input.referenceImageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: input.referenceImageBase64, detail: "high" },
    });
  }

  userContent.push({ type: "text", text: input.prompt });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { prompts?: string[] };
  const prompts = parsed.prompts ?? [];

  // Ensure exactly 4
  const labels = input.mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;
  return labels.map((l, i) => prompts[i] ?? `${input.prompt} — ${l}`);
}

// ── Gemini image generation ────────────────────────────────────────────────

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

async function callGemini(
  prompt: string,
  referenceImageBase64: string | null | undefined
): Promise<{ base64: string; mimeType: string }> {
  const apiKey = resolveGeminiApiKey()!;

  const parts: GeminiPart[] = [];

  if (referenceImageBase64) {
    // Strip data URL prefix: "data:image/jpeg;base64,{data}"
    const match = referenceImageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
    }
  }

  parts.push({ text: prompt });

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ inline_data?: { mime_type: string; data: string } }> };
    }>;
  };

  const imagePart = json.candidates?.[0]?.content?.parts?.find((p) => p.inline_data);
  if (!imagePart?.inline_data) {
    throw new Error("Gemini returned no image in response");
  }

  return {
    base64: imagePart.inline_data.data,
    mimeType: imagePart.inline_data.mime_type,
  };
}

// ── Storage upload ─────────────────────────────────────────────────────────

async function uploadToStorage(
  avatarId: string,
  index: number,
  base64: string,
  mimeType: string
): Promise<string> {
  try {
    const { hasSupabaseConfig, getSupabaseServerClient } = await import(
      "@/lib/supabase/repo-helpers"
    );
    if (!hasSupabaseConfig()) {
      // Return data URL for local dev
      return `data:${mimeType};base64,${base64}`;
    }

    const supabase = await getSupabaseServerClient();
    const buffer = Buffer.from(base64, "base64");
    const path = `generated/${avatarId}/${index}.png`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, buffer, { contentType: "image/png", upsert: true });

    if (error) {
      console.warn("Storage upload failed, using data URL:", error.message);
      return `data:${mimeType};base64,${base64}`;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    return publicUrl;
  } catch {
    return `data:${mimeType};base64,${base64}`;
  }
}

// ── Main export ────────────────────────────────────────────────────────────

export async function generateAvatar(
  input: GenerateAvatarInput
): Promise<GenerateAvatarResult> {
  if (!hasGeminiKey()) {
    console.warn("No Gemini key — returning mock avatar images");
    return getMockResult(input.mode);
  }

  // Step 1: expand prompts
  const expandedPrompts = await expandPrompts(input);

  const labels = input.mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;

  // Step 2: generate all 4 images in parallel
  const results = await Promise.all(
    expandedPrompts.map(async (prompt, index) => {
      try {
        const { base64, mimeType } = await callGemini(
          prompt,
          input.referenceImageBase64
        );
        const url = await uploadToStorage(input.avatarId, index, base64, mimeType);
        return { index, label: labels[index], base64: url, mimeType, isUrl: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generation failed";
        return { index, label: labels[index], error: message };
      }
    })
  );

  return {
    expandedPrompts,
    images: results.map((r) => {
      if ("error" in r) return { index: r.index, label: r.label, error: r.error };
      return { index: r.index, label: r.label, base64: r.base64, mimeType: r.mimeType };
    }),
    usedMock: false,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/services/avatar-generator.ts
git commit -m "feat: avatar generator service (OpenAI prompt expansion + Gemini image gen)"
```

---

## Task 6: Server action

**Files:**
- Create: `src/app/actions/avatars.ts`

```typescript
// src/app/actions/avatars.ts
"use server";

import { revalidatePath } from "next/cache";
import { createAvatar, getAvatarsByUser, deleteAvatar, attachAvatarToCampaign } from "@/lib/repositories/avatar-repo";
import { generateAvatar } from "@/lib/services/avatar-generator";
import { actionFail, actionOk, type ActionResult } from "@/lib/result";
import type { Avatar } from "@/types/avatar";
import type { AvatarMode, AspectRatio } from "@/types/avatar";
import { loadUserKeys } from "./_load-keys";

async function getCurrentUserId(): Promise<string> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? "user-mock-001";
  } catch {
    return "user-mock-001";
  }
}

// ── Generate ────────────────────────────────────────────────────────────────

export async function generateAvatarAction(input: {
  prompt: string;
  mode: AvatarMode;
  aspectRatio: AspectRatio;
  referenceImageBase64?: string | null;
  name?: string;
}): Promise<ActionResult<{ avatar: Avatar; usedMock: boolean }>> {
  try {
    await loadUserKeys();
    const userId = await getCurrentUserId();

    // Pre-create the avatar record to get an ID for storage paths
    const avatar = await createAvatar({
      user_id: userId,
      name: input.name || `Avatar · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      prompt: input.prompt,
      mode: input.mode,
      aspect_ratio: input.aspectRatio,
      reference_image_url: null,
      image_urls: [],
    });

    const result = await generateAvatar({
      prompt: input.prompt,
      mode: input.mode,
      aspectRatio: input.aspectRatio,
      referenceImageBase64: input.referenceImageBase64,
      avatarId: avatar.id,
    });

    // Collect successful image URLs
    const imageUrls = result.images
      .filter((img): img is { index: number; label: string; base64: string; mimeType: string } => "base64" in img)
      .map((img) => img.base64);

    // Update the avatar record with generated image URLs + expanded prompt
    const { updateAvatarImages } = await import("@/lib/repositories/avatar-repo");
    await updateAvatarImages(avatar.id, imageUrls);

    const updatedAvatar: Avatar = { ...avatar, imageUrls, expandedPrompt: result.expandedPrompts[0] ?? null };

    revalidatePath("/avatars");
    return actionOk({ avatar: updatedAvatar, usedMock: result.usedMock });
  } catch (err) {
    console.error("generateAvatarAction:", err);
    return actionFail(err, "Failed to generate avatar.");
  }
}

// ── List ────────────────────────────────────────────────────────────────────

export async function getAvatarsAction(): Promise<ActionResult<Avatar[]>> {
  try {
    const userId = await getCurrentUserId();
    const avatars = await getAvatarsByUser(userId);
    return actionOk(avatars);
  } catch (err) {
    return actionFail(err, "Failed to load avatars.");
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteAvatarAction(avatarId: string): Promise<ActionResult<null>> {
  try {
    await deleteAvatar(avatarId);
    revalidatePath("/avatars");
    return actionOk(null);
  } catch (err) {
    return actionFail(err, "Failed to delete avatar.");
  }
}

// ── Attach to campaign ──────────────────────────────────────────────────────

export async function attachAvatarAction(
  campaignId: string,
  avatarId: string | null
): Promise<ActionResult<null>> {
  try {
    await attachAvatarToCampaign(campaignId, avatarId);
    revalidatePath(`/campaigns/${campaignId}`);
    return actionOk(null);
  } catch (err) {
    return actionFail(err, "Failed to attach avatar.");
  }
}
```

**Step 2: Commit**

```bash
git add src/app/actions/avatars.ts
git commit -m "feat: avatar server actions (generate, list, delete, attach)"
```

---

## Task 7: Sidebar navigation update

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Add Avatars nav item**

In `src/components/layout/sidebar.tsx`, update the imports and navItems:

```typescript
import { LayoutDashboard, PlusCircle, Settings, Zap, UserCircle } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Campaign", href: "/campaigns/new", icon: PlusCircle },
  { label: "Avatars", href: "/avatars", icon: UserCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];
```

**Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Avatars nav item to sidebar"
```

---

## Task 8: Avatar upload zone component

**Files:**
- Create: `src/components/avatars/avatar-upload-zone.tsx`

```typescript
// src/components/avatars/avatar-upload-zone.tsx
"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadZoneProps {
  value: string | null;          // base64 data URL or null
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
        <div className="absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)" }}
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
```

**Step 2: Commit**

```bash
git add src/components/avatars/avatar-upload-zone.tsx
git commit -m "feat: AvatarUploadZone drag-and-drop component"
```

---

## Task 9: Avatar controls panel (left side)

**Files:**
- Create: `src/components/avatars/avatar-controls.tsx`

```typescript
// src/components/avatars/avatar-controls.tsx
"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarUploadZone } from "./avatar-upload-zone";
import { ProviderBadge } from "@/components/ui/provider-badge";
import type { AvatarMode, AspectRatio } from "@/types/avatar";

interface AvatarControlsProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  referenceImage: string | null;
  onReferenceImageChange: (v: string | null) => void;
  mode: AvatarMode;
  onModeChange: (v: AvatarMode) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (v: AspectRatio) => void;
  onGenerate: () => void;
  generating: boolean;
}

const PROMPT_PLACEHOLDERS = [
  "A senior woman in a warm cardigan, friendly smile, natural lighting…",
  "Middle-aged man in a navy suit, confident expression, studio lighting…",
  "Put this person in a modern kitchen setting…",
  "Turn this character into a retired teacher…",
];

export function AvatarControls({
  prompt, onPromptChange,
  referenceImage, onReferenceImageChange,
  mode, onModeChange,
  aspectRatio, onAspectRatioChange,
  onGenerate, generating,
}: AvatarControlsProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1
          className="text-sm font-bold uppercase tracking-widest"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--primary)", letterSpacing: "0.15em" }}
        >
          Avatar Generation
        </h1>
        <ProviderBadge provider="gemini" />
      </div>

      {/* Upload zone */}
      <div className="space-y-1.5">
        <label
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Reference Image <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">— optional</span>
        </label>
        <AvatarUploadZone
          value={referenceImage}
          onChange={onReferenceImageChange}
          disabled={generating}
        />
      </div>

      {/* Prompt */}
      <div className="space-y-1.5">
        <label
          htmlFor="avatar-prompt"
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Prompt
        </label>
        <textarea
          id="avatar-prompt"
          rows={4}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={PROMPT_PLACEHOLDERS[0]}
          disabled={generating}
          className="flex w-full rounded border border-border bg-input text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/40 disabled:opacity-50 transition-colors resize-none"
        />
        <p className="text-[10px] text-muted-foreground/60">
          {referenceImage
            ? "Describe how to modify or pose the reference character."
            : "Describe the character to generate from scratch."}
        </p>
      </div>

      {/* Mode selector */}
      <div className="space-y-1.5">
        <label
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Generation Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["likeness_only", "likeness_environment"] as AvatarMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              disabled={generating}
              className={cn(
                "rounded-md border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                mode === m
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >
              <div className="font-semibold">
                {m === "likeness_only" ? "Likeness Only" : "Likeness + Environment"}
              </div>
              <div className="mt-0.5 text-[10px] opacity-70">
                {m === "likeness_only"
                  ? "4-image character sheet · white bg"
                  : "Character in photorealistic scenes"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div className="space-y-1.5">
        <label
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Aspect Ratio
        </label>
        <div className="flex gap-2">
          {(["16:9", "9:16"] as AspectRatio[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onAspectRatioChange(r)}
              disabled={generating}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                aspectRatio === r
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80"
              )}
            >
              {r}
              <span className="ml-1.5 text-[9px] opacity-60">
                {r === "16:9" ? "Landscape" : "Vertical"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating || !prompt.trim()}
        className={cn(
          "w-full rounded-md px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        )}
        style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em" }}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </span>
        ) : (
          "Generate Avatar"
        )}
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/avatars/avatar-controls.tsx
git commit -m "feat: AvatarControls left panel component"
```

---

## Task 10: Avatar results panel (right side)

**Files:**
- Create: `src/components/avatars/avatar-results.tsx`

```typescript
// src/components/avatars/avatar-results.tsx
"use client";

import { useState } from "react";
import { AlertCircle, RotateCcw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Avatar, AvatarMode } from "@/types/avatar";

// ── Image slot ─────────────────────────────────────────────────────────────

interface SlotState {
  label: string;
  url?: string;
  error?: string;
  loading: boolean;
}

interface AvatarResultsProps {
  generating: boolean;
  mode: AvatarMode;
  generatedAvatar: Avatar | null;
  error: string | null;
  pendingName: string;
  onPendingNameChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  usedMock?: boolean;
}

const LIKENESS_LABELS = ["Front", "3/4 Angle", "Side Profile", "Relaxed Pose"];
const ENVIRONMENT_LABELS = ["Scene 1", "Scene 2", "Scene 3", "Scene 4"];

export function AvatarResults({
  generating, mode, generatedAvatar, error,
  pendingName, onPendingNameChange, onSave, saving, usedMock,
}: AvatarResultsProps) {
  const labels = mode === "likeness_only" ? LIKENESS_LABELS : ENVIRONMENT_LABELS;
  const imageUrls = generatedAvatar?.imageUrls ?? [];

  const slots: SlotState[] = labels.map((label, i) => ({
    label,
    url: imageUrls[i],
    loading: generating,
  }));

  const hasResults = imageUrls.length > 0;
  const isEmpty = !generating && !hasResults && !error;

  return (
    <div className="flex flex-col gap-5">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mock warning */}
      {usedMock && !generating && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          No Gemini API key found — showing placeholder images. Add your key in Settings.
        </div>
      )}

      {/* Image grid */}
      {(generating || hasResults) && (
        <div className="grid grid-cols-2 gap-3">
          {slots.map((slot, i) => (
            <div key={i} className="space-y-1.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {slot.label}
              </p>
              <div className={cn(
                "relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted",
                slot.loading && "animate-pulse"
              )}>
                {slot.url && !slot.loading && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slot.url}
                      alt={slot.label}
                      className="h-full w-full object-cover transition-opacity duration-500"
                    />
                    <a
                      href={slot.url}
                      download={`avatar-${slot.label.toLowerCase().replace(/\s/g, "-")}.png`}
                      className="absolute top-2 right-2 rounded p-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity bg-black/50 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </>
                )}
                {slot.loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full animate-bounce" style={{ background: "var(--primary)" }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <RotateCcw className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No avatar generated yet</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Configure your settings on the left and click Generate Avatar.
          </p>
        </div>
      )}

      {/* Save section — appears after successful generation */}
      {hasResults && !generating && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Save Avatar
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={pendingName}
              onChange={(e) => onPendingNameChange(e.target.value)}
              placeholder="Avatar name…"
              className="flex-1 h-9 rounded border border-border bg-input text-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/40 transition-colors"
            />
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !pendingName.trim()}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/avatars/avatar-results.tsx
git commit -m "feat: AvatarResults right panel with image grid and save section"
```

---

## Task 11: Avatar library component

**Files:**
- Create: `src/components/avatars/avatar-library.tsx`

```typescript
// src/components/avatars/avatar-library.tsx
"use client";

import { useState, useTransition } from "react";
import { Trash2, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
            {/* Thumbnail */}
            <div className="aspect-video w-full overflow-hidden bg-muted">
              {avatar.imageUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar.imageUrls[0]}
                  alt={avatar.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-2 space-y-0.5">
              <p className="text-xs font-medium truncate text-foreground">{avatar.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(avatar.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>

            {/* Delete button */}
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
```

**Step 2: Commit**

```bash
git add src/components/avatars/avatar-library.tsx
git commit -m "feat: AvatarLibrary horizontal scroll component"
```

---

## Task 12: Avatar picker modal (campaign attachment)

**Files:**
- Create: `src/components/avatars/avatar-picker-modal.tsx`

```typescript
// src/components/avatars/avatar-picker-modal.tsx
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
              {/* Remove option */}
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
```

**Step 2: Commit**

```bash
git add src/components/avatars/avatar-picker-modal.tsx
git commit -m "feat: AvatarPickerModal for attaching avatar to campaign"
```

---

## Task 13: Avatar studio shell

**Files:**
- Create: `src/components/avatars/avatar-studio.tsx`

This is the top-level client component that owns all state and wires together the left + right panels.

```typescript
// src/components/avatars/avatar-studio.tsx
"use client";

import { useState, useTransition } from "react";
import { AvatarControls } from "./avatar-controls";
import { AvatarResults } from "./avatar-results";
import { AvatarLibrary } from "./avatar-library";
import { generateAvatarAction } from "@/app/actions/avatars";
import type { Avatar, AvatarMode, AspectRatio } from "@/types/avatar";

interface AvatarStudioProps {
  initialAvatars: Avatar[];
}

export function AvatarStudio({ initialAvatars }: AvatarStudioProps) {
  // Controls state
  const [prompt, setPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [mode, setMode] = useState<AvatarMode>("likeness_only");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  // Results state
  const [generatedAvatar, setGeneratedAvatar] = useState<Avatar | null>(null);
  const [usedMock, setUsedMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();

  // Save state
  const [pendingName, setPendingName] = useState("");
  const [saving, startSaving] = useTransition();

  // Library state
  const [avatars, setAvatars] = useState<Avatar[]>(initialAvatars);

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
        // Add to library immediately
        setAvatars((prev) => [result.data.avatar, ...prev]);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSave() {
    if (!generatedAvatar || !pendingName.trim()) return;
    // Name update is a future enhancement — for now the avatar is already saved
    // Just clear the save form to indicate it's done
    startSaving(async () => {
      // Optional: call a rename action here in the future
      setGeneratedAvatar(null);
      setPendingName("");
    });
  }

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Left panel — controls */}
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

      {/* Right panel — results + library */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <AvatarResults
          generating={generating}
          mode={mode}
          generatedAvatar={generatedAvatar}
          error={error}
          pendingName={pendingName}
          onPendingNameChange={setPendingName}
          onSave={handleSave}
          saving={saving}
          usedMock={usedMock}
        />

        {/* Divider + library */}
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
```

**Step 2: Commit**

```bash
git add src/components/avatars/avatar-studio.tsx
git commit -m "feat: AvatarStudio split-panel shell with full state management"
```

---

## Task 14: Avatars page + loading

**Files:**
- Create: `src/app/(authenticated)/avatars/page.tsx`
- Create: `src/app/(authenticated)/avatars/loading.tsx`

**Step 1: Page**

```typescript
// src/app/(authenticated)/avatars/page.tsx

import { getAvatarsByUser } from "@/lib/repositories/avatar-repo";
import { createClient } from "@/lib/supabase/server";
import { AvatarStudio } from "@/components/avatars/avatar-studio";

async function getCurrentUserId(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? "user-mock-001";
  } catch {
    return "user-mock-001";
  }
}

export default async function AvatarsPage() {
  const userId = await getCurrentUserId();
  const initialAvatars = await getAvatarsByUser(userId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-6">
        <h1
          className="text-xs font-bold uppercase tracking-widest"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}
        >
          Avatar Studio
        </h1>
      </div>
      <div className="flex-1 min-h-0">
        <AvatarStudio initialAvatars={initialAvatars} />
      </div>
    </div>
  );
}
```

**Step 2: Loading skeleton**

```typescript
// src/app/(authenticated)/avatars/loading.tsx

export default function AvatarsLoading() {
  return (
    <div className="flex h-full min-h-0 gap-0 animate-pulse">
      <div className="w-[420px] shrink-0 border-r p-6 space-y-4">
        <div className="h-4 w-36 rounded bg-muted" />
        <div className="aspect-video w-full rounded-lg bg-muted" />
        <div className="h-24 w-full rounded bg-muted" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 rounded-md bg-muted" />
          <div className="h-16 rounded-md bg-muted" />
        </div>
        <div className="h-11 w-full rounded-md bg-muted" />
      </div>
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-video rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/(authenticated)/avatars/page.tsx src/app/(authenticated)/avatars/loading.tsx
git commit -m "feat: avatars page and loading skeleton"
```

---

## Task 15: Campaign Overview — Active Avatar section

**Files:**
- Modify: `src/app/(authenticated)/campaigns/[id]/page.tsx`

Add an "Active Avatar" section that shows the attached avatar and a "Change Avatar" button opening the picker modal.

**Step 1: Add a client wrapper component**

Create a small client component for the interactive avatar section (the page itself is a server component):

Append this to the bottom of `src/app/(authenticated)/campaigns/[id]/page.tsx` (before the final export):

```typescript
// Add at top of file:
import { getAvatarById } from "@/lib/repositories/avatar-repo";

// Modify OverviewTab to also fetch avatar:
// In OverviewTab, add after getCampaignById + getTriggersByCampaign:
const avatar = campaign.avatarId ? await getAvatarById(campaign.avatarId) : null;

// Add AvatarSection import at top:
import { AvatarSection } from "@/components/avatars/avatar-section";

// Add in the JSX, as the first section:
<AvatarSection campaignId={id} avatar={avatar} />
```

**Step 2: Create the interactive AvatarSection client component**

```typescript
// src/components/avatars/avatar-section.tsx
"use client";

import { useState } from "react";
import { UserCircle, RefreshCw } from "lucide-react";
import type { Avatar } from "@/types/avatar";
import { AvatarPickerModal } from "./avatar-picker-modal";
import { cn } from "@/lib/utils";

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
```

Also update `toCampaign` in mappers.ts and the Campaign type to include `avatarId` (done in Task 3 — verify it's there).

**Step 3: Commit**

```bash
git add src/components/avatars/avatar-section.tsx src/app/(authenticated)/campaigns/[id]/page.tsx
git commit -m "feat: Active Avatar section on campaign overview tab"
```

---

## Task 16: Playwright tests

**Files:**
- Create: `tests/avatars.spec.ts`

```typescript
// tests/avatars.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Avatars page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/avatars');
  });

  test('avatars page loads', async ({ page }) => {
    await expect(page).toHaveURL('/avatars');
    await expect(page.getByText('Avatar Generation')).toBeVisible();
  });

  test('sidebar shows Avatars link', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Avatars' })).toBeVisible();
  });

  test('upload zone is present', async ({ page }) => {
    await expect(page.getByText('Upload reference image')).toBeVisible();
  });

  test('mode selector shows both modes', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Likeness Only/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Likeness \+ Environment/i })).toBeVisible();
  });

  test('aspect ratio toggle is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /16:9/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /9:16/i })).toBeVisible();
  });

  test('generate button is disabled without prompt', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Generate Avatar' });
    await expect(btn).toBeDisabled();
  });

  test('generate button enables when prompt is typed', async ({ page }) => {
    await page.getByRole('textbox').fill('A senior woman in a warm cardigan');
    const btn = page.getByRole('button', { name: 'Generate Avatar' });
    await expect(btn).toBeEnabled();
  });
});

test.describe('Campaign Overview - Active Avatar', () => {
  test('shows Active Avatar section', async ({ page }) => {
    await page.goto('/campaigns/camp-1');
    await expect(page.getByText('Active Avatar')).toBeVisible();
  });

  test('shows Attach Avatar button when no avatar', async ({ page }) => {
    await page.goto('/campaigns/camp-1');
    await expect(
      page.getByRole('button', { name: /Attach Avatar/i })
        .or(page.getByRole('button', { name: /Change/i }))
    ).toBeVisible();
  });
});
```

**Step 2: Run tests**

```bash
npx playwright test tests/avatars.spec.ts --reporter=line
```

Expected: all 9 tests pass.

**Step 3: Commit**

```bash
git add tests/avatars.spec.ts
git commit -m "test: Playwright tests for Avatar Studio and campaign integration"
```

---

## Task 17: Final push + Supabase storage bucket

**Step 1: Verify the build passes locally**

```bash
npm run build
```

Expected: no TypeScript errors, build completes.

**Step 2: Create Supabase Storage bucket (if not done in Task 1)**

In Supabase dashboard:
1. Go to **Storage** → **New bucket**
2. Name: `avatars`
3. Public: ✅

**Step 3: Push to GitHub → auto-deploy Vercel**

```bash
git push
```

**Step 4: Verify on Vercel**

1. Check build log — should pass
2. Navigate to `/avatars`
3. Add a prompt, click Generate — should show mock images (or real if Gemini key set)
4. Navigate to any campaign → Overview tab → confirm "Active Avatar" section is visible

---

## Summary of all commits (in order)

1. `feat: add avatars table and campaign avatar_id FK`
2. `feat: add Avatar domain type and database row types`
3. `feat: toAvatar mapper, resolveGeminiApiKey, Gemini provider badge`
4. `feat: avatar repository with Supabase + mock fallback`
5. `feat: avatar generator service (OpenAI prompt expansion + Gemini image gen)`
6. `feat: avatar server actions (generate, list, delete, attach)`
7. `feat: add Avatars nav item to sidebar`
8. `feat: AvatarUploadZone drag-and-drop component`
9. `feat: AvatarControls left panel component`
10. `feat: AvatarResults right panel with image grid and save section`
11. `feat: AvatarLibrary horizontal scroll component`
12. `feat: AvatarPickerModal for attaching avatar to campaign`
13. `feat: AvatarStudio split-panel shell with full state management`
14. `feat: avatars page and loading skeleton`
15. `feat: Active Avatar section on campaign overview tab`
16. `test: Playwright tests for Avatar Studio and campaign integration`
17. Push + Supabase bucket + Vercel deploy verification
