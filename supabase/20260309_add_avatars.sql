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
