# Avatar Generation — Design Document
Date: 2026-03-09

## Overview

A global Avatar Generation studio that allows users to create high-quality photorealistic character model images. Avatars are saved globally and can be attached to campaigns for reuse in scripts, visual plans, and scene generation.

---

## 1. Routes & Navigation

- **Primary route:** `/avatars` — top-level authenticated page, same layout as `/dashboard`
- **Sidebar:** New "Avatars" nav item (UserCircle icon) between Dashboard and Settings
- **Campaign integration:** Campaign Overview tab (`/campaigns/[id]`) gets an "Active Avatar" section showing attached avatar thumbnail + "Change Avatar" button → opens modal picker

---

## 2. Data Model

### New `avatars` table
```sql
id                  uuid primary key default gen_random_uuid()
user_id             uuid not null references auth.users(id)
name                text not null default ''
prompt              text not null
expanded_prompt     text
mode                text not null  -- 'likeness_only' | 'likeness_environment'
aspect_ratio        text not null default '16:9'
reference_image_url text           -- Supabase Storage URL of uploaded reference
image_urls          jsonb not null default '[]'  -- array of generated image URLs
created_at          timestamptz not null default now()
```

### Campaigns table change
```sql
alter table campaigns add column avatar_id uuid references avatars(id);
```

### Supabase Storage
- Bucket: `avatars` (public)
- Reference images: `avatars/refs/{userId}/{filename}`
- Generated images: `avatars/generated/{avatarId}/{index}.png`

---

## 3. Generation Flow

### Step 1 — Prompt Expansion (OpenAI GPT-4o)
- Input: raw user prompt, mode, aspect ratio, whether reference image was provided
- Output:
  - **Likeness Only:** object with 4 angle-specific prompts (front, 3/4, side, relaxed)
  - **Likeness + Environment:** 4 environment-varied prompts
- System prompt instructs: include character description, clothing, pose, lighting, camera framing, realism level, background, aspect ratio

### Step 2 — Image Generation (Gemini `gemini-2.5-flash-image`)
- 4 parallel calls via `Promise.all`
- Each call includes: expanded prompt + reference image as `inline_data` (if uploaded)
- Likeness Only: plain white studio background, consistent lighting instructions per angle
- Environment: photorealistic environments inferred from prompt/reference

### Step 3 — Storage
- Each base64 PNG response uploaded to Supabase Storage
- Path: `avatars/generated/{avatarId}/{index}.png`
- Public URL stored in `image_urls` jsonb array

### Step 4 — Record Creation
- Avatar row inserted with all metadata
- URLs returned to client
- UI swaps skeleton loaders → real images with fade-in

### Error Handling
- Individual image failures show per-slot error state + retry button
- Other successfully generated images save normally
- Full generation failure shows error banner

---

## 4. UI Layout — Split Panel

### Left Panel (~420px fixed, scrollable)
1. **Header:** `AVATAR GENERATION` (Barlow Condensed uppercase) + Gemini provider badge
2. **Upload Zone:** dashed border, drag-and-drop or click. Shows thumbnail preview + remove button when loaded. Accepts JPG/PNG/WEBP ≤10MB.
3. **Prompt Textarea:** 4 rows, rotating placeholder examples
4. **Mode Selector:** Two large toggle buttons — `Likeness Only` / `Likeness + Environment`. Active = neon green border + tint.
5. **Aspect Ratio Toggle:** Two pills — `16:9` (default) / `9:16`
6. **Generate Button:** Full width, primary style. Shows spinner + "Generating…" when active.

### Right Panel (flex-1)
1. **Active Generation Grid:** 2×2 labeled grid (Front / 3/4 / Side / Relaxed for Likeness Only; unlabeled for Environment). Skeleton loaders → images fade in as each completes.
2. **Save Section:** Appears after generation — text input pre-filled with "Avatar · Mar 9", "Save Avatar" confirm button.
3. **Saved Avatars Library:** Horizontal scroll row below divider. Each card: first image thumbnail, name, date, "Attach to Campaign" button.

### Avatar Picker Modal (campaign attachment)
- Triggered from campaign Overview tab
- Grid of saved avatar thumbnails
- Click to select → attaches to campaign → modal closes
- Shows currently attached avatar with checkmark

---

## 5. File Structure

### New Files
```
src/app/(authenticated)/avatars/page.tsx
src/app/(authenticated)/avatars/loading.tsx
src/app/actions/avatars.ts
src/components/avatars/avatar-studio.tsx        # split-panel shell
src/components/avatars/avatar-controls.tsx      # left panel
src/components/avatars/avatar-results.tsx       # right panel
src/components/avatars/avatar-upload-zone.tsx
src/components/avatars/avatar-library.tsx       # saved avatars scroll row
src/components/avatars/avatar-picker-modal.tsx  # campaign attach modal
src/lib/services/avatar-generator.ts           # OpenAI + Gemini logic
src/lib/repositories/avatar-repo.ts
src/types/avatar.ts
supabase/20260309_add_avatars.sql
```

### Modified Files
```
src/components/layout/sidebar.tsx              # add Avatars nav item
src/types/database.ts                          # AvatarRow, AvatarInsert types
src/lib/mappers.ts                             # toAvatar mapper
src/app/(authenticated)/campaigns/[id]/page.tsx # Active Avatar section
supabase/schema.sql                            # avatars table + campaign FK
```

---

## 6. TypeScript Types

```typescript
// src/types/avatar.ts
export interface Avatar {
  id: string;
  userId: string;
  name: string;
  prompt: string;
  expandedPrompt: string | null;
  mode: 'likeness_only' | 'likeness_environment';
  aspectRatio: '16:9' | '9:16';
  referenceImageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
}
```

---

## 7. API Keys

- **OpenAI:** Already in Settings (`openai` key) — used for prompt expansion
- **Gemini:** Already in Settings (`gemini` key) — used for image generation
- No new credentials required

---

## 8. Future Integration (Scenes)

Generated avatars stored with metadata and consistent URLs are designed for reuse. The `avatar_id` FK on campaigns makes it straightforward to reference the same character model when building the Scenes / Scene Variations feature.
