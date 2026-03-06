-- Migration: add settings table for user-managed API keys.
-- Keys are stored as plain text. Use Supabase Vault or column encryption
-- in production if stricter at-rest encryption is required.

create table if not exists settings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  claude_api_key      text,
  openai_api_key      text,
  elevenlabs_api_key  text,
  seedream_api_key    text,
  gemini_api_key      text,
  kling_api_key       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint settings_one_per_user unique (user_id)
);

alter table settings enable row level security;

create policy "Users can manage own settings"
  on settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on every write
create or replace function update_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger settings_updated_at
  before update on settings
  for each row
  execute function update_settings_updated_at();
