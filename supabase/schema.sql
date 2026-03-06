-- ============================================================
-- Final Expense Creative OS — Supabase Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------
-- campaigns
-- -----------------------------------------------------------
create table campaigns (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null,
  title                 text not null,
  offer_name            text,
  persona_id            text,
  archetype_id          text,
  emotional_tone        text,
  duration_seconds      int,
  phone_number          text,
  phone_number_phonetic text,
  deadline_text         text,
  benefit_amount        text,
  affordability_text    text,
  cta_style             text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table campaigns enable row level security;

create policy "Users can manage own campaigns"
  on campaigns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function update_updated_at();

-- -----------------------------------------------------------
-- campaign_triggers
-- -----------------------------------------------------------
create table campaign_triggers (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  trigger_key  text not null,
  included     boolean not null default true
);

alter table campaign_triggers enable row level security;

create policy "Users can manage own campaign triggers"
  on campaign_triggers for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_triggers.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = campaign_triggers.campaign_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- concepts
-- -----------------------------------------------------------
create table concepts (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  title               text not null,
  one_sentence_angle  text,
  hook                text,
  emotional_setup     text,
  conflict            text,
  solution            text,
  payoff              text,
  cta                 text,
  trigger_map         jsonb,
  visual_world        text,
  llm_raw             jsonb,
  is_selected         boolean not null default false,
  created_at          timestamptz not null default now()
);

alter table concepts enable row level security;

create policy "Users can manage own concepts"
  on concepts for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = concepts.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = concepts.campaign_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- scripts
-- -----------------------------------------------------------
create table scripts (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references campaigns(id) on delete cascade,
  concept_id       uuid not null references concepts(id) on delete cascade,
  version_name     text,
  duration_seconds int,
  full_script      text,
  hook             text,
  body             text,
  cta              text,
  metadata         jsonb,
  created_at       timestamptz not null default now()
);

alter table scripts enable row level security;

create policy "Users can manage own scripts"
  on scripts for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = scripts.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = scripts.campaign_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- vo_scripts (voiceover scripts)
-- -----------------------------------------------------------
create table vo_scripts (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  script_id       uuid not null references scripts(id) on delete cascade,
  tagged_script   text,
  voice_profile   text,
  delivery_notes  text,
  created_at      timestamptz not null default now()
);

alter table vo_scripts enable row level security;

create policy "Users can manage own vo_scripts"
  on vo_scripts for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = vo_scripts.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = vo_scripts.campaign_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- visual_plans
-- -----------------------------------------------------------
create table visual_plans (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  script_id           uuid not null references scripts(id) on delete cascade,
  overall_direction   text,
  base_layer          text,
  a_roll              jsonb,
  b_roll              jsonb,
  scene_breakdown     jsonb,
  created_at          timestamptz not null default now()
);

alter table visual_plans enable row level security;

create policy "Users can manage own visual_plans"
  on visual_plans for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = visual_plans.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = visual_plans.campaign_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- prompts (image prompts)
-- -----------------------------------------------------------
create table prompts (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  visual_plan_id  uuid not null references visual_plans(id) on delete cascade,
  scene_name      text,
  prompt_type     text,
  prompt_text     text,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

alter table prompts enable row level security;

create policy "Users can manage own prompts"
  on prompts for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = prompts.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = prompts.campaign_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- campaign_versions
-- -----------------------------------------------------------
create table campaign_versions (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  name         text not null,
  snapshot     jsonb not null,
  created_at   timestamptz not null default now()
);

alter table campaign_versions enable row level security;

create policy "Users can manage own campaign_versions"
  on campaign_versions for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_versions.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = campaign_versions.campaign_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- creative_variations
-- -----------------------------------------------------------
create table creative_variations (
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

-- -----------------------------------------------------------
-- Indexes for common queries
-- -----------------------------------------------------------
create index idx_campaigns_user_id on campaigns(user_id);
create index idx_campaign_triggers_campaign_id on campaign_triggers(campaign_id);
create index idx_concepts_campaign_id on concepts(campaign_id);
create index idx_scripts_campaign_id on scripts(campaign_id);
create index idx_scripts_concept_id on scripts(concept_id);
create index idx_vo_scripts_campaign_id on vo_scripts(campaign_id);
create index idx_vo_scripts_script_id on vo_scripts(script_id);
create index idx_visual_plans_campaign_id on visual_plans(campaign_id);
create index idx_visual_plans_script_id on visual_plans(script_id);
create index idx_prompts_campaign_id on prompts(campaign_id);
create index idx_prompts_visual_plan_id on prompts(visual_plan_id);
create index idx_campaign_versions_campaign_id on campaign_versions(campaign_id);
create index idx_creative_variations_campaign_id on creative_variations(campaign_id);
