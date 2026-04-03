-- Animus Database Schema
-- Complete schema with RLS policies, triggers, and indexes

-- Extensions
create extension if not exists "uuid-ossp";

-- Custom types
create type subscription_tier as enum ('free', 'premium');
create type world_entry_category as enum ('person', 'place', 'theme', 'life_event');
create type limit_type as enum ('go_deeper', 'image_refinement', 'shadow_exercise', 'dream_connection', 'dream_insights');
create type report_period as enum ('weekly', 'monthly');

-- ============================================================
-- TABLES
-- ============================================================

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  subscription_tier subscription_tier default 'free',
  onboarding_completed boolean default false,
  ai_context jsonb default '{}',
  dream_count integer default 0,
  streak_current integer default 0,
  streak_longest integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table dreams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  recorded_at timestamptz default now(),
  title text,
  raw_transcript text,
  journal_text text,
  interpretation text,
  image_url text,
  image_style text,
  image_prompt text,
  mood text,
  lucidity_level integer check (lucidity_level >= 0 and lucidity_level <= 10),
  is_favorite boolean default false,
  audio_url text,
  model_used text,
  created_at timestamptz default now()
);

create table dream_symbols (
  id uuid primary key default uuid_generate_v4(),
  dream_id uuid not null references dreams on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  symbol text not null,
  archetype text,
  sentiment text,
  created_at timestamptz default now()
);

create table dream_conversations (
  id uuid primary key default uuid_generate_v4(),
  dream_id uuid not null references dreams on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  exchange_number integer not null,
  created_at timestamptz default now()
);

create table shadow_exercises (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  dream_id uuid references dreams on delete set null,
  prompt text not null,
  response text,
  created_at timestamptz default now()
);

create table world_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  category world_entry_category not null,
  name text not null,
  description text,
  relationship text,
  ai_suggested boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table dream_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  dream_a_id uuid not null references dreams on delete cascade,
  dream_b_id uuid not null references dreams on delete cascade,
  analysis text not null,
  created_at timestamptz default now()
);

create table archetype_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  snapshot_date date not null,
  archetypes jsonb not null,
  dominant text,
  rising text[],
  created_at timestamptz default now()
);

create table pattern_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  period_type report_period not null,
  period_start date not null,
  period_end date not null,
  report text not null,
  image_url text,
  created_at timestamptz default now()
);

create table usage_limits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  dream_id uuid references dreams on delete cascade,
  limit_type limit_type not null,
  count integer default 0,
  period_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_dreams_user_date on dreams (user_id, created_at desc);
create index idx_dream_symbols_user_symbol on dream_symbols (user_id, symbol);
create index idx_dream_symbols_user_archetype on dream_symbols (user_id, archetype);
create index idx_conversations_dream on dream_conversations (dream_id, exchange_number);
create index idx_shadow_user on shadow_exercises (user_id, created_at desc);
create index idx_world_entries_user_cat on world_entries (user_id, category);
create index idx_connections_user on dream_connections (user_id);
create index idx_archetype_user_date on archetype_snapshots (user_id, snapshot_date desc);
create index idx_reports_user_date on pattern_reports (user_id, period_end desc);
create index idx_usage_limits_dream on usage_limits (user_id, dream_id, limit_type);
create index idx_usage_limits_daily on usage_limits (user_id, limit_type, period_date);

-- Unique constraints for usage limits
create unique index idx_usage_limits_per_dream
  on usage_limits (user_id, dream_id, limit_type) where dream_id is not null;
create unique index idx_usage_limits_per_day
  on usage_limits (user_id, limit_type, period_date) where period_date is not null;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table dreams enable row level security;
alter table dream_symbols enable row level security;
alter table dream_conversations enable row level security;
alter table shadow_exercises enable row level security;
alter table world_entries enable row level security;
alter table dream_connections enable row level security;
alter table archetype_snapshots enable row level security;
alter table pattern_reports enable row level security;
alter table usage_limits enable row level security;

-- Profiles
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Dreams
create policy "dreams_select_own" on dreams for select using (auth.uid() = user_id);
create policy "dreams_insert_own" on dreams for insert with check (auth.uid() = user_id);
create policy "dreams_update_own" on dreams for update using (auth.uid() = user_id);
create policy "dreams_delete_own" on dreams for delete using (auth.uid() = user_id);

-- Dream symbols
create policy "symbols_select_own" on dream_symbols for select using (auth.uid() = user_id);
create policy "symbols_insert_own" on dream_symbols for insert with check (auth.uid() = user_id);
create policy "symbols_delete_own" on dream_symbols for delete using (auth.uid() = user_id);

-- Dream conversations
create policy "convos_select_own" on dream_conversations for select using (
  auth.uid() = (select user_id from dreams where id = dream_conversations.dream_id)
);
create policy "convos_insert_own" on dream_conversations for insert with check (
  auth.uid() = (select user_id from dreams where id = dream_conversations.dream_id)
);

-- Shadow exercises
create policy "shadow_select_own" on shadow_exercises for select using (auth.uid() = user_id);
create policy "shadow_insert_own" on shadow_exercises for insert with check (auth.uid() = user_id);
create policy "shadow_update_own" on shadow_exercises for update using (auth.uid() = user_id);

-- World entries
create policy "world_select_own" on world_entries for select using (auth.uid() = user_id);
create policy "world_insert_own" on world_entries for insert with check (auth.uid() = user_id);
create policy "world_update_own" on world_entries for update using (auth.uid() = user_id);
create policy "world_delete_own" on world_entries for delete using (auth.uid() = user_id);

-- Dream connections
create policy "connections_select_own" on dream_connections for select using (auth.uid() = user_id);
create policy "connections_insert_own" on dream_connections for insert with check (auth.uid() = user_id);

-- Archetype snapshots
create policy "archetypes_select_own" on archetype_snapshots for select using (auth.uid() = user_id);
create policy "archetypes_insert_own" on archetype_snapshots for insert with check (auth.uid() = user_id);

-- Pattern reports
create policy "reports_select_own" on pattern_reports for select using (auth.uid() = user_id);
create policy "reports_insert_own" on pattern_reports for insert with check (auth.uid() = user_id);

-- Usage limits
create policy "limits_select_own" on usage_limits for select using (auth.uid() = user_id);
create policy "limits_insert_own" on usage_limits for insert with check (auth.uid() = user_id);
create policy "limits_update_own" on usage_limits for update using (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update streak + dream count on new dream
create or replace function public.update_dream_stats()
returns trigger as $$
declare
  last_dream_date date;
  cur_streak integer;
  max_streak integer;
begin
  select max(created_at::date) into last_dream_date
  from dreams where user_id = new.user_id and id != new.id;

  select streak_current, streak_longest into cur_streak, max_streak
  from profiles where id = new.user_id;

  if last_dream_date = current_date - interval '1 day' then
    cur_streak := cur_streak + 1;
  elsif last_dream_date = current_date then
    -- Same day, no change to streak
    null;
  else
    cur_streak := 1;
  end if;

  if cur_streak > max_streak then
    max_streak := cur_streak;
  end if;

  update profiles set
    dream_count = dream_count + 1,
    streak_current = cur_streak,
    streak_longest = max_streak,
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_dream_created
  after insert on dreams
  for each row execute procedure public.update_dream_stats();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public) values ('dream-images', 'dream-images', true);
insert into storage.buckets (id, name, public) values ('dream-audio', 'dream-audio', false);
insert into storage.buckets (id, name, public) values ('report-images', 'report-images', true);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Storage policies: users can only access their own files (prefixed by user_id)
create policy "dream_images_select" on storage.objects for select using (
  bucket_id = 'dream-images'
);
create policy "dream_images_insert" on storage.objects for insert with check (
  bucket_id = 'dream-images' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "dream_audio_select" on storage.objects for select using (
  bucket_id = 'dream-audio' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "dream_audio_insert" on storage.objects for insert with check (
  bucket_id = 'dream-audio' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "report_images_select" on storage.objects for select using (
  bucket_id = 'report-images'
);
create policy "report_images_insert" on storage.objects for insert with check (
  bucket_id = 'report-images' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_select" on storage.objects for select using (
  bucket_id = 'avatars'
);
create policy "avatars_insert" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
