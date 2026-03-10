-- Supporting characters for campaigns
-- Allows users to define named people (husband, daughter, etc.) with reference photos
-- so Gemini can reproduce their likeness in generated scene images.

create table if not exists campaign_characters (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  name                text not null,
  reference_image_url text,
  created_at          timestamptz not null default now()
);

create index if not exists campaign_characters_campaign_id_idx on campaign_characters (campaign_id);
