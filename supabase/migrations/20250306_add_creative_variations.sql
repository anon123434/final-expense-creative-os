-- Migration: add creative_variations table
-- Run this against an existing database that already has the base schema.

create table if not exists creative_variations (
  id                     uuid primary key default gen_random_uuid(),
  campaign_id            uuid not null references campaigns(id) on delete cascade,
  title                  text not null,
  hook                   text,
  one_sentence_angle     text,
  emotional_tone         text,
  what_changed           jsonb,
  trigger_stack          jsonb,
  scene_summary          jsonb,
  image_prompt_examples  jsonb,
  kling_prompt_examples  jsonb,
  raw_output             jsonb,
  created_at             timestamptz not null default now()
);

alter table creative_variations enable row level security;

create policy "Users can manage own creative_variations"
  on creative_variations for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = creative_variations.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = creative_variations.campaign_id
        and c.user_id = auth.uid()
    )
  );

create index if not exists idx_creative_variations_campaign_id
  on creative_variations(campaign_id);
