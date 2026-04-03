# Animus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Animus — a Jungian dream journal app with AI interpretation, dream artwork generation, pattern tracking, shadow work, and a constellation-style Dream Web visualization.

**Architecture:** Expo/React Native app with expo-router file-based navigation, Supabase for auth/database/storage/edge functions. Claude Sonnet 4.6 for dream interpretation (called from Supabase Edge Functions), Gemini 3.1 Flash Image Preview for dream artwork. Offline recording via expo-sqlite queue. Monetized via ads (react-native-google-mobile-ads) + premium subscription (RevenueCat).

**Tech Stack:** Expo SDK 55, React Native 0.83, expo-router, @supabase/supabase-js, expo-av (recording), @react-native-voice/voice (real-time STT), expo-sqlite (offline queue), react-native-reanimated (animations), @shopify/react-native-skia (Dream Web constellation), react-native-google-mobile-ads, react-native-view-shot (share cards), react-native-purchases (RevenueCat), expo-secure-store, expo-sharing

---

## File Structure

```
animus/
├── app/
│   ├── _layout.tsx                     # Root layout (fonts, auth gate, providers)
│   ├── (auth)/
│   │   ├── _layout.tsx                 # Auth stack layout
│   │   ├── sign-in.tsx                 # Email/password sign-in
│   │   └── sign-up.tsx                 # Registration
│   ├── (onboarding)/
│   │   ├── _layout.tsx                 # Onboarding stack layout
│   │   └── index.tsx                   # "Map your inner world" guided flow
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # Bottom tab navigator (5 tabs)
│   │   ├── record.tsx                  # Center tab — voice recording
│   │   ├── journal.tsx                 # Dream gallery
│   │   ├── dream-map.tsx              # Heatmap calendar + Dream Web
│   │   ├── shadow-work.tsx            # Shadow exercises
│   │   └── my-world.tsx               # Personal context profile
│   ├── dream/
│   │   └── [id].tsx                    # Dream detail page (modal)
│   └── settings.tsx                    # Account, subscription, notifications
├── components/
│   ├── ui/
│   │   ├── AnimusButton.tsx            # Styled button (organic, rounded)
│   │   ├── AnimusCard.tsx              # Dark glass card with rounded corners
│   │   ├── OuroborosSpinner.tsx        # Snake-eating-tail loading animation
│   │   ├── MandalaD divider.tsx         # Section divider with mandala pattern
│   │   └── ErrorBoundary.tsx           # Error boundary wrapper
│   ├── recording/
│   │   ├── RecordButton.tsx            # Pulsing mic button
│   │   └── TranscriptOverlay.tsx       # Live transcript display during recording
│   ├── journal/
│   │   ├── DreamCard.tsx               # Gallery card (image + title + spine color)
│   │   ├── JournalPage.tsx             # Full dream detail layout (serif, spine, image)
│   │   └── MonthHeader.tsx             # Collapsible month group header
│   ├── interpretation/
│   │   └── GoDeeper.tsx                # "Go deeper" conversation UI
│   ├── dream-map/
│   │   ├── HeatmapCalendar.tsx         # GitHub-style day grid
│   │   └── DreamWeb.tsx                # Skia constellation visualization
│   ├── shadow/
│   │   ├── ExerciseCard.tsx            # Shadow exercise prompt card
│   │   └── ExerciseSheet.tsx           # Bottom sheet for writing response
│   ├── my-world/
│   │   ├── WorldEntryCard.tsx          # Person/place/theme/event card
│   │   └── WorldEntryForm.tsx          # Add/edit world entry form
│   ├── ads/
│   │   ├── AdGate.tsx                  # Interstitial wrapper with transparent message
│   │   └── NativeAdCard.tsx            # Native ad styled as journal card
│   ├── premium/
│   │   ├── PremiumGate.tsx             # "Upgrade to Premium" prompt
│   │   ├── ArchetypeCard.tsx           # Archetype profile dashboard card
│   │   └── PatternReport.tsx           # Dream Patterns AI report page
│   └── sharing/
│       └── ShareCardView.tsx           # Share card layout for react-native-view-shot
├── constants/
│   ├── theme.ts                        # Colors, typography, spacing, gradients
│   ├── archetypes.ts                   # Jungian archetype definitions & descriptions
│   └── art-styles.ts                   # Dream image art style rotation logic
├── contexts/
│   ├── AuthContext.tsx                  # Supabase auth state + session management
│   └── SubscriptionContext.tsx          # Premium status + RevenueCat
├── hooks/
│   ├── useAuth.ts                      # Auth convenience hook (re-exports context)
│   ├── useRecording.ts                 # expo-av recording + @react-native-voice/voice STT
│   ├── useDreams.ts                    # Dream CRUD operations
│   ├── useWorldEntries.ts              # My World CRUD
│   ├── useShadowExercises.ts           # Shadow exercise CRUD
│   ├── useUsageLimits.ts               # Check/increment usage limits
│   ├── useSubscription.ts              # Premium status hook (re-exports context)
│   └── useOfflineQueue.ts              # SQLite queue for offline dreams
├── lib/
│   ├── supabase.ts                     # Supabase client (SecureStore adapter)
│   ├── ai.ts                           # Edge function callers (interpret, generate, etc.)
│   ├── offline.ts                      # SQLite database setup + queue operations
│   └── ads.ts                          # AdMob initialization
├── types/
│   └── database.ts                     # TypeScript types matching Supabase schema
├── supabase/
│   ├── migrations/
│   │   └── 20260327000000_initial_schema.sql
│   └── functions/
│       ├── interpret-dream/index.ts
│       ├── generate-image/index.ts
│       ├── go-deeper/index.ts
│       ├── shadow-exercise/index.ts
│       ├── dream-insights/index.ts
│       ├── suggest-world-entry/index.ts
│       ├── dream-connection/index.ts
│       └── archetype-snapshot/index.ts
├── assets/
│   ├── images/
│   │   └── logo.png                    # Animus logo
│   └── fonts/                          # Georgia or serif font files
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── eas.json
└── .env.local                          # Supabase + API keys (gitignored)
```

---

## Phase 1: Foundation & Core Loop

*After this phase: record a dream → get AI interpretation + artwork → browse your journal*

---

### Task 1: Project Scaffold & Dependencies

**Files:**
- Create: `animus/` (entire project scaffold)
- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `eas.json`
- Create: `.env.local`, `.gitignore`

- [ ] **Step 1: Create Expo project**

```bash
cd "C:\Users\hunte\Desktop\Reality Suites"
npx create-expo-app@latest Animus --template blank-typescript
cd Animus
```

Expected: Project created with Expo SDK 55, TypeScript template.

- [ ] **Step 2: Install core dependencies**

```bash
npx expo install expo-router expo-linking expo-status-bar expo-splash-screen expo-font expo-secure-store expo-av expo-sqlite expo-haptics expo-linear-gradient expo-image expo-dev-client expo-sharing react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-screens react-native-svg @react-native-async-storage/async-storage
```

- [ ] **Step 3: Install Supabase + external packages**

```bash
npm install @supabase/supabase-js react-native-url-polyfill @react-native-voice/voice @shopify/react-native-skia react-native-view-shot react-native-google-mobile-ads react-native-purchases
```

- [ ] **Step 4: Install dev dependencies**

```bash
npm install -D @types/react jest @testing-library/react-native ts-jest
```

- [ ] **Step 5: Configure app.json for expo-router**

Replace `app.json` with:

```json
{
  "expo": {
    "name": "Animus",
    "slug": "animus",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/logo.png",
    "scheme": "animus",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "splash": {
      "backgroundColor": "#0a0812"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.realitysuites.animus",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Animus needs microphone access to record your dreams via voice.",
        "NSSpeechRecognitionUsageDescription": "Animus uses speech recognition to transcribe your dream recordings in real-time."
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0a0812"
      },
      "package": "com.realitysuites.animus",
      "permissions": ["RECORD_AUDIO"]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-sqlite",
      [
        "expo-av",
        {
          "microphonePermission": "Animus needs microphone access to record your dreams via voice."
        }
      ],
      "@shopify/react-native-skia"
    ]
  }
}
```

- [ ] **Step 6: Configure babel.config.js**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 7: Configure tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 8: Create .env.local and .gitignore**

`.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Add to `.gitignore`:
```
.env*.local
```

- [ ] **Step 9: Create eas.json for dev builds**

```json
{
  "cli": { "version": ">= 2.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

- [ ] **Step 10: Create directory structure**

```bash
mkdir -p app/(auth) app/(onboarding) app/(tabs) app/dream components/ui components/recording components/journal components/interpretation components/dream-map components/shadow components/my-world components/ads components/premium components/sharing constants contexts hooks lib types supabase/migrations supabase/functions assets/images assets/fonts
```

- [ ] **Step 11: Initialize git and commit**

```bash
git init
git add .
git commit -m "chore: scaffold Animus Expo project with dependencies"
```

---

### Task 2: Database Schema, RLS & TypeScript Types

**Files:**
- Create: `supabase/migrations/20260327000000_initial_schema.sql`
- Create: `types/database.ts`

- [ ] **Step 1: Write the complete database migration**

Create `supabase/migrations/20260327000000_initial_schema.sql`:

```sql
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
```

- [ ] **Step 2: Apply migration to Supabase**

Go to Supabase Dashboard → SQL Editor → paste the migration SQL and run it.

Alternatively with Supabase CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Write TypeScript types**

Create `types/database.ts`:

```typescript
export type SubscriptionTier = 'free' | 'premium';
export type WorldEntryCategory = 'person' | 'place' | 'theme' | 'life_event';
export type LimitType = 'go_deeper' | 'image_refinement' | 'shadow_exercise' | 'dream_connection' | 'dream_insights';
export type ReportPeriod = 'weekly' | 'monthly';
export type DreamMood = 'peaceful' | 'anxious' | 'surreal' | 'dark' | 'joyful' | 'mysterious' | 'chaotic' | 'melancholic';
export type ConversationRole = 'user' | 'assistant';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  onboarding_completed: boolean;
  ai_context: Record<string, unknown>;
  dream_count: number;
  streak_current: number;
  streak_longest: number;
  created_at: string;
  updated_at: string;
}

export interface Dream {
  id: string;
  user_id: string;
  recorded_at: string;
  title: string | null;
  raw_transcript: string | null;
  journal_text: string | null;
  interpretation: string | null;
  image_url: string | null;
  image_style: string | null;
  image_prompt: string | null;
  mood: DreamMood | null;
  lucidity_level: number | null;
  is_favorite: boolean;
  audio_url: string | null;
  model_used: string | null;
  created_at: string;
}

export interface DreamSymbol {
  id: string;
  dream_id: string;
  user_id: string;
  symbol: string;
  archetype: string | null;
  sentiment: string | null;
  created_at: string;
}

export interface DreamConversation {
  id: string;
  dream_id: string;
  role: ConversationRole;
  content: string;
  exchange_number: number;
  created_at: string;
}

export interface ShadowExercise {
  id: string;
  user_id: string;
  dream_id: string | null;
  prompt: string;
  response: string | null;
  created_at: string;
}

export interface WorldEntry {
  id: string;
  user_id: string;
  category: WorldEntryCategory;
  name: string;
  description: string | null;
  relationship: string | null;
  ai_suggested: boolean;
  created_at: string;
  updated_at: string;
}

export interface DreamConnection {
  id: string;
  user_id: string;
  dream_a_id: string;
  dream_b_id: string;
  analysis: string;
  created_at: string;
}

export interface ArchetypeSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  archetypes: Record<string, number>;
  dominant: string | null;
  rising: string[];
  created_at: string;
}

export interface PatternReport {
  id: string;
  user_id: string;
  period_type: ReportPeriod;
  period_start: string;
  period_end: string;
  report: string;
  image_url: string | null;
  created_at: string;
}

export interface UsageLimit {
  id: string;
  user_id: string;
  dream_id: string | null;
  limit_type: LimitType;
  count: number;
  period_date: string | null;
  created_at: string;
  updated_at: string;
}

// Edge function response types
export interface InterpretDreamResponse {
  journal_text: string;
  title: string;
  interpretation: string;
  symbols: { symbol: string; archetype: string; sentiment: string }[];
  mood: DreamMood;
  image_prompt: string;
  model_used: string;
}

export interface GenerateImageResponse {
  image_url: string;
  style: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/ types/
git commit -m "feat: add database schema, RLS policies, and TypeScript types"
```

---

### Task 3: Supabase Client & Auth Context

**Files:**
- Create: `lib/supabase.ts`
- Create: `contexts/AuthContext.tsx`
- Create: `hooks/useAuth.ts`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/sign-in.tsx`
- Create: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Create Supabase client**

Create `lib/supabase.ts` (following Lotus pattern):

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 2: Create AuthContext**

Create `contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Create hooks/useAuth.ts**

Create `hooks/useAuth.ts`:

```typescript
export { useAuth } from '@/contexts/AuthContext';
```

- [ ] **Step 4: Create auth layout**

Create `app/(auth)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#0a0812' },
    }} />
  );
}
```

- [ ] **Step 5: Create sign-in screen**

Create `app/(auth)/sign-in.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts } from '@/constants/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Animus</Text>
        <Text style={styles.tagline}>Reveal what lies beneath.</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </Pressable>

        <Link href="/(auth)/sign-up" asChild>
          <Pressable>
            <Text style={styles.link}>Don't have an account? Sign up</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontFamily: fonts.serif, fontSize: 48, color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  tagline: { fontFamily: fonts.serif, fontSize: 16, color: colors.purple, textAlign: 'center', marginBottom: 48, fontStyle: 'italic' },
  error: { color: '#ff6b6b', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  input: {
    backgroundColor: colors.bgCard,
    color: colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  link: { color: colors.purple, textAlign: 'center', fontSize: 14 },
});
```

- [ ] **Step 6: Create sign-up screen**

Create `app/(auth)/sign-up.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts } from '@/constants/theme';

export default function SignUp() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signUp(email.trim(), password);
    if (err) setError(err);
    else setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <View style={[styles.container, styles.inner]}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.tagline}>We sent a confirmation link to {email}</Text>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable><Text style={styles.link}>Back to sign in</Text></Pressable>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Begin your journey</Text>
        <Text style={styles.tagline}>Create your Animus account</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textMuted}
          value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor={colors.textMuted}
          value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
        </Pressable>

        <Link href="/(auth)/sign-in" asChild>
          <Pressable><Text style={styles.link}>Already have an account? Sign in</Text></Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontFamily: fonts.serif, fontSize: 32, color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  tagline: { fontFamily: fonts.serif, fontSize: 16, color: colors.purple, textAlign: 'center', marginBottom: 48, fontStyle: 'italic' },
  error: { color: '#ff6b6b', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  input: {
    backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  button: { backgroundColor: colors.purple, borderRadius: 12, paddingVertical: 16, marginTop: 8, marginBottom: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  link: { color: colors.purple, textAlign: 'center', fontSize: 14 },
});
```

- [ ] **Step 7: Commit**

```bash
git add lib/supabase.ts contexts/AuthContext.tsx hooks/useAuth.ts app/(auth)/
git commit -m "feat: add Supabase client, auth context, and sign-in/sign-up screens"
```

---

### Task 4: Navigation Shell & Theme

**Files:**
- Create: `constants/theme.ts`
- Create: `constants/archetypes.ts`
- Create: `constants/art-styles.ts`
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: placeholder screens for all 5 tabs

- [ ] **Step 1: Create theme constants**

Create `constants/theme.ts`:

```typescript
export const colors = {
  bgDeep: '#0a0812',
  bgDark: '#12101a',
  bgCard: '#1a1726',
  bgCardHover: '#221e30',
  purple: '#9370DB',
  purpleDim: '#6a4fb0',
  indigo: '#4B0082',
  oceanBlue: '#4682B4',
  oceanDark: '#1a2a3a',
  warmGlow: '#d4a574',
  textPrimary: '#e8e0f0',
  textSecondary: '#a89cc0',
  textMuted: '#6b5f80',
  border: '#2a2438',
  borderLight: '#3a3248',
  error: '#ff6b6b',
  success: '#6bffa0',
  // Mood colors (for heatmap and dream card spines)
  moodPeaceful: '#7eb8da',
  moodAnxious: '#da7e7e',
  moodSurreal: '#b87eda',
  moodDark: '#4a3a5a',
  moodJoyful: '#dac87e',
  moodMysterious: '#7e8eda',
  moodChaotic: '#da7ebc',
  moodMelancholic: '#7eaada',
};

export const fonts = {
  serif: 'Georgia',
  sansRegular: 'System',
  sansMedium: 'System',
  sansBold: 'System',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const moodColors: Record<string, string> = {
  peaceful: colors.moodPeaceful,
  anxious: colors.moodAnxious,
  surreal: colors.moodSurreal,
  dark: colors.moodDark,
  joyful: colors.moodJoyful,
  mysterious: colors.moodMysterious,
  chaotic: colors.moodChaotic,
  melancholic: colors.moodMelancholic,
};
```

- [ ] **Step 2: Create archetypes constant**

Create `constants/archetypes.ts`:

```typescript
export interface ArchetypeInfo {
  id: string;
  name: string;
  description: string;
  symbol: string;
}

export const ARCHETYPES: ArchetypeInfo[] = [
  { id: 'shadow', name: 'The Shadow', description: 'The hidden, repressed parts of yourself — what you deny, fear, or refuse to see.', symbol: '🌑' },
  { id: 'anima', name: 'The Anima', description: 'The feminine aspect within the masculine psyche — emotion, intuition, receptivity.', symbol: '🌙' },
  { id: 'animus', name: 'The Animus', description: 'The masculine aspect within the feminine psyche — logic, assertiveness, action.', symbol: '☀️' },
  { id: 'wise_old', name: 'The Wise Old Man/Woman', description: 'The inner guide — wisdom, knowledge, and spiritual insight.', symbol: '🦉' },
  { id: 'trickster', name: 'The Trickster', description: 'The disruptor — chaos, humor, boundary-breaking, transformation through play.', symbol: '🃏' },
  { id: 'hero', name: 'The Hero', description: 'The achiever — courage, determination, overcoming obstacles.', symbol: '⚔️' },
  { id: 'self', name: 'The Self', description: 'The unified whole — integration, balance, the center of the psyche.', symbol: '☯️' },
  { id: 'great_mother', name: 'The Great Mother', description: 'The nurturer — creation, protection, abundance, and sometimes devouring control.', symbol: '🌍' },
  { id: 'child', name: 'The Child', description: 'The innocent — new beginnings, wonder, vulnerability, potential.', symbol: '✨' },
  { id: 'persona', name: 'The Persona', description: 'The mask — the face you show the world, social roles, conformity.', symbol: '🎭' },
];

export const ARCHETYPE_MAP = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]));
```

- [ ] **Step 3: Create art styles constant**

Create `constants/art-styles.ts`:

```typescript
export interface ArtStyle {
  id: string;
  name: string;
  promptPrefix: string;
}

export const ART_STYLES: ArtStyle[] = [
  { id: 'surrealist', name: 'Surrealist', promptPrefix: 'surrealist painting in the style of Salvador Dalí, melting forms, impossible geometry,' },
  { id: 'dark_fantasy', name: 'Dark Fantasy', promptPrefix: 'dark fantasy painting, dramatic chiaroscuro lighting, rich shadows,' },
  { id: 'watercolor', name: 'Watercolor', promptPrefix: 'soft watercolor painting, flowing colors, delicate brushstrokes, gentle bleeds,' },
  { id: 'magical_realism', name: 'Magical Realism', promptPrefix: 'magical realism painting, everyday scene with impossible elements, warm lighting,' },
  { id: 'ink_wash', name: 'Ink Wash', promptPrefix: 'East Asian ink wash painting, flowing black ink, minimalist composition,' },
  { id: 'art_nouveau', name: 'Art Nouveau', promptPrefix: 'Art Nouveau illustration, flowing organic lines, decorative borders, muted golds,' },
  { id: 'gothic', name: 'Gothic', promptPrefix: 'gothic painting, cathedral architecture, moody blue-black atmosphere,' },
  { id: 'ethereal', name: 'Ethereal', promptPrefix: 'ethereal glowing art, luminous beings, soft divine light, translucent,' },
  { id: 'folklore', name: 'Folklore', promptPrefix: 'folk art illustration, rich patterns, mythological themes, earthy palette,' },
  { id: 'expressionist', name: 'Expressionist', promptPrefix: 'expressionist painting, bold distorted colors, raw emotional energy,' },
];

const MOOD_STYLE_MAP: Record<string, string[]> = {
  peaceful: ['watercolor', 'ethereal', 'ink_wash'],
  anxious: ['expressionist', 'surrealist', 'gothic'],
  surreal: ['surrealist', 'magical_realism', 'art_nouveau'],
  dark: ['dark_fantasy', 'gothic', 'ink_wash'],
  joyful: ['watercolor', 'folklore', 'art_nouveau'],
  mysterious: ['dark_fantasy', 'ethereal', 'gothic'],
  chaotic: ['expressionist', 'surrealist', 'dark_fantasy'],
  melancholic: ['watercolor', 'ink_wash', 'ethereal'],
};

export function selectArtStyle(mood: string, previousStyleIds: string[]): ArtStyle {
  const candidates = MOOD_STYLE_MAP[mood] || ['surrealist', 'watercolor', 'dark_fantasy'];

  // Pick the least recently used style from mood-appropriate candidates
  for (const styleId of candidates) {
    if (!previousStyleIds.includes(styleId)) {
      return ART_STYLES.find(s => s.id === styleId)!;
    }
  }

  // All candidates used recently — use the first candidate
  return ART_STYLES.find(s => s.id === candidates[0])!;
}
```

- [ ] **Step 4: Create root layout**

Create `app/_layout.tsx`:

```typescript
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { session, loading, profile } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/(auth)/sign-in');
    } else if (profile && !profile.onboarding_completed) {
      router.replace('/(onboarding)');
    } else if (session) {
      router.replace('/(tabs)/record');
    }
  }, [session, loading, profile]);

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.bgDeep },
      animation: 'fade',
    }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="dream/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 5: Create tab layout**

Create `app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/constants/theme';

// Minimal SVG icons (inline to avoid icon library dependency)
function RecordIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={[styles.recordWrap, { width: size + 20, height: size + 20 }]}>
      <View style={[styles.recordDot, { width: size, height: size, backgroundColor: color }]} />
    </View>
  );
}

function TabIcon({ d, color, size }: { d: string; color: string; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}><Path d={d} /></Svg>;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.bgDark,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: 80,
        paddingBottom: 20,
        paddingTop: 8,
      },
      tabBarActiveTintColor: colors.purple,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarLabelStyle: { fontSize: 11 },
    }}>
      <Tabs.Screen name="journal" options={{
        title: 'Journal',
        tabBarIcon: ({ color, size }) => <TabIcon d="M4 19V5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" color={color} size={size} />,
      }} />
      <Tabs.Screen name="dream-map" options={{
        title: 'Dream Map',
        tabBarIcon: ({ color, size }) => <TabIcon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" color={color} size={size} />,
      }} />
      <Tabs.Screen name="record" options={{
        title: 'Record',
        tabBarIcon: ({ color, size }) => <RecordIcon color={color} size={size} />,
      }} />
      <Tabs.Screen name="shadow-work" options={{
        title: 'Shadow',
        tabBarIcon: ({ color, size }) => <TabIcon d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71" color={color} size={size} />,
      }} />
      <Tabs.Screen name="my-world" options={{
        title: 'My World',
        tabBarIcon: ({ color, size }) => <TabIcon d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" color={color} size={size} />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  recordWrap: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -10,
  },
  recordDot: {
    borderRadius: 999,
  },
});
```

- [ ] **Step 6: Create placeholder tab screens**

Create `app/(tabs)/record.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

export default function RecordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Cast your line.{'\n'}What did you dream last night?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { fontFamily: fonts.serif, fontSize: 20, color: colors.textSecondary, textAlign: 'center', lineHeight: 30, fontStyle: 'italic' },
});
```

Create `app/(tabs)/journal.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

export default function JournalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your dream journal is empty.{'\n'}Record your first dream to begin.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { fontFamily: fonts.serif, fontSize: 18, color: colors.textSecondary, textAlign: 'center', lineHeight: 28 },
});
```

Create `app/(tabs)/dream-map.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

export default function DreamMapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your Dream Map will grow as you record dreams.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { fontFamily: fonts.serif, fontSize: 18, color: colors.textSecondary, textAlign: 'center', lineHeight: 28 },
});
```

Create `app/(tabs)/shadow-work.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

export default function ShadowWorkScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Shadow work exercises will appear here{'\n'}as you explore your dreams.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { fontFamily: fonts.serif, fontSize: 18, color: colors.textSecondary, textAlign: 'center', lineHeight: 28 },
});
```

Create `app/(tabs)/my-world.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

export default function MyWorldScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map your inner world.{'\n'}Add the people, places, and themes that matter to you.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { fontFamily: fonts.serif, fontSize: 18, color: colors.textSecondary, textAlign: 'center', lineHeight: 28 },
});
```

- [ ] **Step 7: Create onboarding placeholder**

Create `app/(onboarding)/_layout.tsx`:
```typescript
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgDeep } }} />;
}
```

Create `app/(onboarding)/index.tsx`:
```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/constants/theme';

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();

  const handleSkip = async () => {
    if (user) {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
      await refreshProfile();
    }
    router.replace('/(tabs)/record');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map your inner world</Text>
      <Text style={styles.body}>
        Tell Animus about the people, places, and themes that matter to you.
        This helps your dream interpretations feel deeply personal.
      </Text>
      <Text style={styles.body}>You can always add this later from the My World tab.</Text>

      <Pressable style={styles.button} onPress={handleSkip}>
        <Text style={styles.buttonText}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', padding: 32 },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary, textAlign: 'center', marginBottom: 24 },
  body: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 16 },
  button: { backgroundColor: colors.bgCard, borderRadius: 12, paddingVertical: 16, marginTop: 32, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.purple, textAlign: 'center', fontSize: 16, fontWeight: '500' },
});
```

- [ ] **Step 8: Test the app runs**

```bash
npx expo start
```

Expected: App launches, shows sign-in screen. After sign-in, shows 5 tabs with placeholder screens.

- [ ] **Step 9: Commit**

```bash
git add constants/ app/ components/
git commit -m "feat: add navigation shell, theme constants, and placeholder screens"
```

---

### Task 5: Audio Recording with expo-av

**Files:**
- Create: `hooks/useRecording.ts`
- Create: `components/recording/RecordButton.tsx`
- Create: `components/recording/TranscriptOverlay.tsx`

- [ ] **Step 1: Create the recording hook**

Create `hooks/useRecording.ts`:

```typescript
import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  transcript: string;
  audioUri: string | null;
  duration: number;
  error: string | null;
}

export function useRecording() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    transcript: '',
    audioUri: null,
    duration: 0,
    error: null,
  });
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onSpeechResults = useCallback((e: SpeechResultsEvent) => {
    const text = e.value?.[0] ?? '';
    setState(prev => ({ ...prev, transcript: text }));
  }, []);

  const onSpeechError = useCallback((e: { error?: { message?: string } }) => {
    // Speech recognition errors are non-fatal — user still has the audio recording
    console.warn('Speech recognition error:', e.error?.message);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, transcript: '', audioUri: null, duration: 0 }));

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setState(prev => ({ ...prev, error: 'Microphone permission denied' }));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start audio recording (expo-av)
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      // Start speech-to-text (@react-native-voice/voice)
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
      try {
        await Voice.start('en-US');
      } catch {
        // Voice recognition may not be available — continue with audio-only
        console.warn('Voice recognition unavailable — recording audio only');
      }

      // Track duration
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      setState(prev => ({ ...prev, isRecording: true, isPaused: false }));
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to start recording: ${err}` }));
    }
  }, [onSpeechResults, onSpeechError]);

  const pauseRecording = useCallback(async () => {
    try {
      await recordingRef.current?.pauseAsync();
      try { await Voice.stop(); } catch {}
      if (intervalRef.current) clearInterval(intervalRef.current);
      setState(prev => ({ ...prev, isPaused: true }));
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to pause: ${err}` }));
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      await recordingRef.current?.startAsync();
      try {
        Voice.onSpeechResults = onSpeechResults;
        await Voice.start('en-US');
      } catch {}
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      setState(prev => ({ ...prev, isPaused: false }));
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to resume: ${err}` }));
    }
  }, [onSpeechResults]);

  const stopRecording = useCallback(async () => {
    try {
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Stop speech recognition
      try { await Voice.stop(); await Voice.destroy(); } catch {}

      // Stop audio recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

        setState(prev => ({ ...prev, isRecording: false, isPaused: false, audioUri: uri }));
        return { transcript: state.transcript, audioUri: uri };
      }

      setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
      return { transcript: state.transcript, audioUri: null };
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to stop: ${err}`, isRecording: false }));
      return { transcript: state.transcript, audioUri: null };
    }
  }, [state.transcript]);

  const updateTranscript = useCallback((text: string) => {
    setState(prev => ({ ...prev, transcript: text }));
  }, []);

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    updateTranscript,
  };
}
```

- [ ] **Step 2: Create RecordButton component**

Create `components/recording/RecordButton.tsx`:

```typescript
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, cancelAnimation } from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface RecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  onPress: () => void;
  size?: number;
}

export function RecordButton({ isRecording, isPaused, onPress, size = 80 }: RecordButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (isRecording && !isPaused) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1, true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.4, { duration: 1000 })
        ),
        -1, true
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.4, { duration: 200 });
    }
  }, [isRecording, isPaused, scale, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.4 }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.wrapper}>
      <Animated.View style={[styles.pulse, { width: size, height: size, borderRadius: size / 2 }, pulseStyle]} />
      <Animated.View style={[
        styles.button,
        { width: size, height: size, borderRadius: isRecording && !isPaused ? 16 : size / 2 },
      ]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { justifyContent: 'center', alignItems: 'center' },
  pulse: { position: 'absolute', backgroundColor: colors.purple },
  button: { backgroundColor: colors.purple },
});
```

- [ ] **Step 3: Create TranscriptOverlay component**

Create `components/recording/TranscriptOverlay.tsx`:

```typescript
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { colors, fonts } from '@/constants/theme';

interface TranscriptOverlayProps {
  transcript: string;
  isRecording: boolean;
  onTranscriptEdit: (text: string) => void;
}

export function TranscriptOverlay({ transcript, isRecording, onTranscriptEdit }: TranscriptOverlayProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!transcript && isRecording) {
    return (
      <View style={styles.container}>
        <Text style={styles.listening}>Listening...</Text>
      </View>
    );
  }

  if (!transcript) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isEditing || !isRecording ? (
        <TextInput
          style={styles.input}
          value={transcript}
          onChangeText={onTranscriptEdit}
          multiline
          placeholder="Edit your dream transcript..."
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
        />
      ) : (
        <Text style={styles.transcript}>{transcript}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, maxHeight: 300 },
  content: { padding: 16 },
  listening: { fontFamily: fonts.serif, fontSize: 16, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  transcript: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, lineHeight: 28 },
  input: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, lineHeight: 28, textAlignVertical: 'top' },
});
```

- [ ] **Step 4: Commit**

```bash
git add hooks/useRecording.ts components/recording/
git commit -m "feat: add audio recording hook and RecordButton component"
```

---

### Task 6: Recording Screen

**Files:**
- Modify: `app/(tabs)/record.tsx`

- [ ] **Step 1: Build the full recording screen**

Replace `app/(tabs)/record.tsx`:

```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useRecording } from '@/hooks/useRecording';
import { RecordButton } from '@/components/recording/RecordButton';
import { TranscriptOverlay } from '@/components/recording/TranscriptOverlay';
import { colors, fonts, spacing } from '@/constants/theme';

export default function RecordScreen() {
  const {
    isRecording, isPaused, transcript, duration, error,
    startRecording, pauseRecording, resumeRecording, stopRecording, updateTranscript,
  } = useRecording();
  const [saving, setSaving] = useState(false);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRecordPress = async () => {
    if (!isRecording) {
      await startRecording();
    } else if (isPaused) {
      await resumeRecording();
    } else {
      await pauseRecording();
    }
  };

  const handleSave = async () => {
    if (!transcript.trim()) return;
    setSaving(true);
    const result = await stopRecording();
    // Navigate to processing screen or handle inline
    // For now, we'll call the AI pipeline in Task 10
    router.push({ pathname: '/dream/new', params: { transcript: result.transcript, audioUri: result.audioUri ?? '' } });
    setSaving(false);
  };

  const handleDiscard = async () => {
    await stopRecording();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Duration */}
        {isRecording && (
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
        )}

        {/* Empty state */}
        {!isRecording && !transcript && (
          <Text style={styles.emptyText}>Cast your line.{'\n'}What did you dream last night?</Text>
        )}

        {/* Transcript */}
        <TranscriptOverlay
          transcript={transcript}
          isRecording={isRecording}
          onTranscriptEdit={updateTranscript}
        />

        {/* Error */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Controls */}
        <View style={styles.controls}>
          {isRecording && (
            <Pressable style={styles.discardButton} onPress={handleDiscard}>
              <Text style={styles.discardText}>Discard</Text>
            </Pressable>
          )}

          <RecordButton
            isRecording={isRecording}
            isPaused={isPaused}
            onPress={handleRecordPress}
          />

          {isRecording && (
            <Pressable
              style={[styles.saveButton, !transcript.trim() && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!transcript.trim() || saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
            </Pressable>
          )}
        </View>

        {/* Hint */}
        {isPaused && (
          <Text style={styles.hint}>Paused — tap the button to resume</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  duration: { fontSize: 48, color: colors.textPrimary, fontVariant: ['tabular-nums'], marginBottom: spacing.lg },
  emptyText: { fontFamily: fonts.serif, fontSize: 20, color: colors.textMuted, textAlign: 'center', lineHeight: 30, fontStyle: 'italic', marginBottom: spacing.xxl },
  error: { color: colors.error, textAlign: 'center', marginBottom: spacing.md, fontSize: 14 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, marginTop: spacing.xxl },
  discardButton: { padding: spacing.md },
  discardText: { color: colors.textMuted, fontSize: 14 },
  saveButton: { backgroundColor: colors.purple, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  saveButtonDisabled: { opacity: 0.3 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 14, marginTop: spacing.md, fontStyle: 'italic' },
});
```

- [ ] **Step 2: Test recording**

```bash
npx expo start
```

Open on a physical device (microphone required). Tap the record button, speak, verify transcript appears, tap save.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/record.tsx
git commit -m "feat: build recording screen with voice capture and live transcript"
```

---

### Task 7: Offline Queue (expo-sqlite)

**Files:**
- Create: `lib/offline.ts`
- Create: `hooks/useOfflineQueue.ts`

- [ ] **Step 1: Create SQLite offline queue**

Create `lib/offline.ts`:

```typescript
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'animus_offline.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_dreams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transcript TEXT NOT NULL,
        audio_uri TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0
      );
    `);
  }
  return db;
}

export async function queueDream(transcript: string, audioUri: string | null): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO offline_dreams (transcript, audio_uri) VALUES (?, ?)',
    transcript, audioUri
  );
  return result.lastInsertRowId;
}

export interface OfflineDream {
  id: number;
  transcript: string;
  audio_uri: string | null;
  created_at: string;
  synced: number;
}

export async function getUnsyncedDreams(): Promise<OfflineDream[]> {
  const database = await getDb();
  return database.getAllAsync<OfflineDream>(
    'SELECT * FROM offline_dreams WHERE synced = 0 ORDER BY created_at ASC'
  );
}

export async function markSynced(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE offline_dreams SET synced = 1 WHERE id = ?', id);
}

export async function deletesynced(): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM offline_dreams WHERE synced = 1');
}
```

- [ ] **Step 2: Create offline queue hook**

Create `hooks/useOfflineQueue.ts`:

```typescript
import { useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getUnsyncedDreams, markSynced, queueDream, deletesynced } from '@/lib/offline';
import { processDream } from '@/lib/ai';

export function useOfflineQueue() {
  const syncingRef = useRef(false);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const dreams = await getUnsyncedDreams();
      for (const dream of dreams) {
        try {
          await processDream(dream.transcript, dream.audio_uri);
          await markSynced(dream.id);
        } catch (err) {
          console.warn(`Failed to sync dream ${dream.id}:`, err);
          break; // Stop on first failure, try again later
        }
      }
      await deletesynced();
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Listen for connectivity changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) syncQueue();
    });
    // Also try syncing on mount
    syncQueue();
    return unsubscribe;
  }, [syncQueue]);

  const saveDreamOffline = useCallback(async (transcript: string, audioUri: string | null) => {
    return queueDream(transcript, audioUri);
  }, []);

  return { saveDreamOffline, syncQueue };
}
```

- [ ] **Step 3: Install NetInfo if not already installed**

```bash
npx expo install @react-native-community/netinfo
```

- [ ] **Step 4: Commit**

```bash
git add lib/offline.ts hooks/useOfflineQueue.ts
git commit -m "feat: add SQLite offline queue for dream recording"
```

---

### Task 8: interpret-dream Edge Function

**Files:**
- Create: `supabase/functions/interpret-dream/index.ts`

- [ ] **Step 1: Write the interpret-dream edge function**

Create `supabase/functions/interpret-dream/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const BASE_SYSTEM_PROMPT = `You are a warm, wise dream analyst rooted in Carl Jung's depth psychology. You interpret dreams through the lens of archetypes, shadow, anima/animus, the collective unconscious, and individuation.

Your voice is poetic and metaphorical, never clinical. You ask "Could this represent..." not "This represents..." You are a companion in the dreamer's inner exploration.

When analyzing a dream, you will:
1. Polish the raw transcript into beautiful journal prose — clean fragments, "um"s, repetition, but preserve the dreamer's voice and word choices. This is THEIR journal, not yours.
2. Generate an evocative title (3-6 words).
3. Write a personalized Jungian interpretation. Surface shadow elements naturally.
4. Extract key symbols and map them to archetypes (Shadow, Anima, Animus, Wise Old Man/Woman, Trickster, Hero, Self, Great Mother, Child, Persona).
5. Detect the dream's emotional mood.
6. Generate a vivid, detailed image prompt for a painting of this dream.

Respond ONLY with valid JSON (no markdown wrapping):
{
  "journal_text": "polished dream prose preserving dreamer's voice",
  "title": "Evocative Title",
  "interpretation": "Jungian interpretation with shadow elements surfaced naturally",
  "symbols": [{"symbol": "water", "archetype": "Unconscious", "sentiment": "neutral"}],
  "mood": "peaceful|anxious|surreal|dark|joyful|mysterious|chaotic|melancholic",
  "image_prompt": "detailed scene description for dream painting, visual and atmospheric"
}`;

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    }});
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { transcript } = await req.json();
    if (!transcript?.trim()) {
      return new Response(JSON.stringify({ error: 'No transcript provided' }), { status: 400 });
    }

    // Fetch user context in parallel
    const [profileRes, worldRes, symbolsRes] = await Promise.all([
      supabase.from('profiles').select('ai_context, subscription_tier').eq('id', user.id).single(),
      supabase.from('world_entries').select('category, name, description, relationship').eq('user_id', user.id),
      supabase.from('dream_symbols').select('symbol, archetype, sentiment, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    ]);

    const profile = profileRes.data;
    const worldEntries = worldRes.data || [];
    const recentSymbols = symbolsRes.data || [];

    // Build personal context layer
    let personalContext = '';
    if (worldEntries.length > 0) {
      personalContext = '\n\nDreamer\'s personal world:\n' +
        worldEntries.map((e: any) =>
          `- ${e.name} (${e.category}): ${e.description || ''}${e.relationship ? ` [${e.relationship}]` : ''}`
        ).join('\n');
    }

    // Build compressed dream history layer
    let historyContext = '';
    if (recentSymbols.length > 0) {
      const counts: Record<string, { count: number; archetype: string; sentiment: string }> = {};
      for (const s of recentSymbols) {
        if (!counts[s.symbol]) counts[s.symbol] = { count: 0, archetype: s.archetype, sentiment: s.sentiment };
        counts[s.symbol].count++;
      }
      historyContext = '\n\nRecent dream symbol patterns:\n' +
        Object.entries(counts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 20)
          .map(([sym, d]) => `- "${sym}" (${d.archetype}, ${d.sentiment}) appeared ${d.count}x`)
          .join('\n');
    }

    const isPremium = profile?.subscription_tier === 'premium';
    const wordRange = isPremium ? '300-400' : '150-200';

    const systemPrompt = BASE_SYSTEM_PROMPT + personalContext + historyContext +
      `\n\nInterpretation length target: ${wordRange} words.`;

    // Call Claude Sonnet 4.6
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Here is my dream:\n\n${transcript}` }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(JSON.stringify({ error: 'AI request failed', details: errText }), { status: 502 });
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.content[0].text;

    // Parse JSON response (handle possible markdown wrapping)
    let parsed;
    try {
      const jsonStr = rawContent.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: rawContent }), { status: 502 });
    }

    return new Response(JSON.stringify({
      journal_text: parsed.journal_text,
      title: parsed.title,
      interpretation: parsed.interpretation,
      symbols: parsed.symbols || [],
      mood: parsed.mood,
      image_prompt: parsed.image_prompt,
      model_used: 'claude-sonnet-4-6',
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
```

- [ ] **Step 2: Set Supabase secrets**

```bash
npx supabase secrets set ANTHROPIC_API_KEY=your_anthropic_api_key
```

- [ ] **Step 3: Deploy and test**

```bash
npx supabase functions deploy interpret-dream
```

Test with curl:
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/interpret-dream" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "I was walking through a forest at night. The trees were massive and glowing with a soft blue light. I found a door in one of the trees."}'
```

Expected: JSON response with journal_text, title, interpretation, symbols, mood, image_prompt.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/interpret-dream/
git commit -m "feat: add interpret-dream edge function with Claude Sonnet 4.6"
```

---

### Task 9: generate-image Edge Function

**Files:**
- Create: `supabase/functions/generate-image/index.ts`

- [ ] **Step 1: Write the generate-image edge function**

Create `supabase/functions/generate-image/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    }});
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { image_prompt, style_prefix, dream_id } = await req.json();
    if (!image_prompt) {
      return new Response(JSON.stringify({ error: 'No image_prompt provided' }), { status: 400 });
    }

    const fullPrompt = `${style_prefix || ''} ${image_prompt}. Dreamlike, evocative, no text or words in the image.`;

    // Call Gemini 3.1 Flash Image Preview
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate an image: ${fullPrompt}` }] }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            responseMimeType: 'image/png',
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: 'Image generation failed', details: errText }), { status: 502 });
    }

    const geminiResult = await geminiResponse.json();

    // Extract image data from response
    let imageBase64 = '';
    for (const part of geminiResult.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image in AI response' }), { status: 502 });
    }

    // Decode base64 and upload to Supabase Storage
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const fileName = `${user.id}/${dream_id || crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('dream-images')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: 'Upload failed', details: uploadError.message }), { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('dream-images')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({
      image_url: publicUrl,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
```

- [ ] **Step 2: Set Google AI secret**

```bash
npx supabase secrets set GOOGLE_AI_API_KEY=your_google_ai_api_key
```

- [ ] **Step 3: Deploy and test**

```bash
npx supabase functions deploy generate-image
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-image/
git commit -m "feat: add generate-image edge function with Gemini"
```

---

### Task 10: Dream Processing Pipeline & AI Client

**Files:**
- Create: `lib/ai.ts`
- Create: `hooks/useDreams.ts`
- Create: `app/dream/[id].tsx` (placeholder detail page)

- [ ] **Step 1: Create AI edge function client**

Create `lib/ai.ts`:

```typescript
import { supabase } from './supabase';
import { selectArtStyle } from '@/constants/art-styles';
import type { InterpretDreamResponse, Dream, DreamSymbol } from '@/types/database';

async function callEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Edge function ${name} failed`);
  }

  return response.json();
}

export async function processDream(transcript: string, audioUri: string | null): Promise<Dream> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Step 1: Interpret the dream
  const interpretation = await callEdgeFunction<InterpretDreamResponse>('interpret-dream', { transcript });

  // Step 2: Get recent styles for rotation
  const { data: recentDreams } = await supabase
    .from('dreams')
    .select('image_style')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const previousStyles = (recentDreams || []).map(d => d.image_style).filter(Boolean);
  const artStyle = selectArtStyle(interpretation.mood, previousStyles);

  // Step 3: Insert dream record (without image — image is async)
  const { data: dream, error: insertError } = await supabase
    .from('dreams')
    .insert({
      user_id: user.id,
      raw_transcript: transcript,
      title: interpretation.title,
      journal_text: interpretation.journal_text,
      interpretation: interpretation.interpretation,
      mood: interpretation.mood,
      image_style: artStyle.id,
      image_prompt: interpretation.image_prompt,
      model_used: interpretation.model_used,
    })
    .select()
    .single();

  if (insertError || !dream) throw new Error(insertError?.message || 'Failed to save dream');

  // Step 4: Insert symbols
  if (interpretation.symbols.length > 0) {
    await supabase.from('dream_symbols').insert(
      interpretation.symbols.map(s => ({
        dream_id: dream.id,
        user_id: user.id,
        symbol: s.symbol,
        archetype: s.archetype,
        sentiment: s.sentiment,
      }))
    );
  }

  // Step 5: Generate image (async — don't block)
  generateAndAttachImage(dream.id, interpretation.image_prompt, artStyle.promptPrefix).catch(err => {
    console.warn('Image generation failed:', err);
  });

  // Step 6: Upload audio for premium users
  if (audioUri) {
    uploadAudio(dream.id, user.id, audioUri).catch(err => {
      console.warn('Audio upload failed:', err);
    });
  }

  return dream;
}

async function generateAndAttachImage(dreamId: string, imagePrompt: string, stylePrefix: string) {
  const result = await callEdgeFunction<{ image_url: string }>('generate-image', {
    image_prompt: imagePrompt,
    style_prefix: stylePrefix,
    dream_id: dreamId,
  });

  await supabase
    .from('dreams')
    .update({ image_url: result.image_url })
    .eq('id', dreamId);
}

async function uploadAudio(dreamId: string, userId: string, audioUri: string) {
  // Check if user is premium
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (profile?.subscription_tier !== 'premium') return;

  const response = await fetch(audioUri);
  const blob = await response.blob();
  const fileName = `${userId}/${dreamId}.m4a`;

  const { error } = await supabase.storage
    .from('dream-audio')
    .upload(fileName, blob, { contentType: 'audio/mp4' });

  if (!error) {
    const { data: { publicUrl } } = supabase.storage.from('dream-audio').getPublicUrl(fileName);
    await supabase.from('dreams').update({ audio_url: publicUrl }).eq('id', dreamId);
  }
}

// Export for other edge function callers
export { callEdgeFunction };
```

- [ ] **Step 2: Create useDreams hook**

Create `hooks/useDreams.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Dream, DreamSymbol } from '@/types/database';

export function useDreams() {
  const { user } = useAuth();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDreams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDreams(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDreams(); }, [fetchDreams]);

  const getDream = useCallback(async (id: string) => {
    const { data } = await supabase.from('dreams').select('*').eq('id', id).single();
    return data as Dream | null;
  }, []);

  const getDreamSymbols = useCallback(async (dreamId: string) => {
    const { data } = await supabase
      .from('dream_symbols')
      .select('*')
      .eq('dream_id', dreamId);
    return (data || []) as DreamSymbol[];
  }, []);

  const toggleFavorite = useCallback(async (dreamId: string, currentValue: boolean) => {
    await supabase.from('dreams').update({ is_favorite: !currentValue }).eq('id', dreamId);
    setDreams(prev => prev.map(d => d.id === dreamId ? { ...d, is_favorite: !currentValue } : d));
  }, []);

  return { dreams, loading, fetchDreams, getDream, getDreamSymbols, toggleFavorite };
}
```

- [ ] **Step 3: Create dream detail placeholder**

Create `app/dream/[id].tsx`:

```typescript
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDreams } from '@/hooks/useDreams';
import { Image } from 'expo-image';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Dream, DreamSymbol } from '@/types/database';

export default function DreamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDream, getDreamSymbols } = useDreams();
  const [dream, setDream] = useState<Dream | null>(null);
  const [symbols, setSymbols] = useState<DreamSymbol[]>([]);

  useEffect(() => {
    if (!id) return;
    getDream(id).then(setDream);
    getDreamSymbols(id).then(setSymbols);
  }, [id, getDream, getDreamSymbols]);

  if (!dream) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Surfacing from the depths...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Dream image */}
      {dream.image_url && (
        <Image source={{ uri: dream.image_url }} style={styles.image} contentFit="cover" />
      )}

      {/* Title */}
      <Text style={styles.title}>{dream.title}</Text>

      {/* Date */}
      <Text style={styles.date}>
        {new Date(dream.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </Text>

      {/* Journal text */}
      <Text style={styles.journalText}>{dream.journal_text}</Text>

      {/* Interpretation */}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Interpretation</Text>
      <Text style={styles.interpretation}>{dream.interpretation}</Text>

      {/* Symbols */}
      {symbols.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Symbols</Text>
          <View style={styles.symbolsRow}>
            {symbols.map(s => (
              <View key={s.id} style={styles.symbolChip}>
                <Text style={styles.symbolText}>{s.symbol}</Text>
                <Text style={styles.archetypeText}>{s.archetype}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  content: { paddingBottom: 60 },
  loading: { fontFamily: fonts.serif, fontSize: 18, color: colors.textMuted, textAlign: 'center', marginTop: 100, fontStyle: 'italic' },
  image: { width: '100%', height: 300 },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.sm },
  date: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  journalText: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, lineHeight: 30, paddingHorizontal: spacing.lg },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg, marginHorizontal: spacing.lg },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 16, color: colors.purple, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, fontStyle: 'italic' },
  interpretation: { fontFamily: fonts.serif, fontSize: 16, color: colors.textSecondary, lineHeight: 26, paddingHorizontal: spacing.lg },
  symbolsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
  symbolChip: { backgroundColor: colors.bgCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  symbolText: { color: colors.textPrimary, fontSize: 14 },
  archetypeText: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
```

- [ ] **Step 4: Wire up the recording screen to the pipeline**

Update the `handleSave` in `app/(tabs)/record.tsx` — replace the router.push line:

Find this block in `app/(tabs)/record.tsx`:
```typescript
  const handleSave = async () => {
    if (!transcript.trim()) return;
    setSaving(true);
    const result = await stopRecording();
    // Navigate to processing screen or handle inline
    // For now, we'll call the AI pipeline in Task 10
    router.push({ pathname: '/dream/new', params: { transcript: result.transcript, audioUri: result.audioUri ?? '' } });
    setSaving(false);
  };
```

Replace with:
```typescript
  const handleSave = async () => {
    if (!transcript.trim()) return;
    setSaving(true);
    const result = await stopRecording();

    try {
      // Check connectivity
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const dream = await processDream(result.transcript, result.audioUri ?? null);
        router.push({ pathname: '/dream/[id]', params: { id: dream.id } });
      } else {
        await saveDreamOffline(result.transcript, result.audioUri ?? null);
        // Show confirmation — dream will process when online
        alert('Dream saved locally. It will be processed when you\'re back online.');
      }
    } catch (err) {
      // Fallback to offline queue on any error
      await saveDreamOffline(result.transcript, result.audioUri ?? null);
      alert('Dream saved locally. It will be processed shortly.');
    }
    setSaving(false);
  };
```

Add these imports to the top of `app/(tabs)/record.tsx`:
```typescript
import NetInfo from '@react-native-community/netinfo';
import { processDream } from '@/lib/ai';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
```

And add inside the component:
```typescript
const { saveDreamOffline } = useOfflineQueue();
```

- [ ] **Step 5: Test the full flow**

Build a dev client, run on a physical device:
```bash
npx expo start --dev-client
```

Record a dream → save → verify AI interpretation appears → verify image loads after ~10-30s.

- [ ] **Step 6: Commit**

```bash
git add lib/ai.ts hooks/useDreams.ts app/dream/ app/(tabs)/record.tsx
git commit -m "feat: wire up dream processing pipeline — record, interpret, generate image"
```

---

### Task 11: Journal Gallery

**Files:**
- Create: `components/journal/DreamCard.tsx`
- Create: `components/journal/MonthHeader.tsx`
- Modify: `app/(tabs)/journal.tsx`

- [ ] **Step 1: Create DreamCard component**

Create `components/journal/DreamCard.tsx`:

```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, fonts, spacing, moodColors, borderRadius } from '@/constants/theme';
import type { Dream } from '@/types/database';

interface DreamCardProps {
  dream: Dream;
}

export function DreamCard({ dream }: DreamCardProps) {
  const spineColor = dream.mood ? moodColors[dream.mood] || colors.purple : colors.purple;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/dream/[id]', params: { id: dream.id } })}
    >
      {/* Color spine */}
      <View style={[styles.spine, { backgroundColor: spineColor }]} />

      <View style={styles.content}>
        {/* Image */}
        {dream.image_url ? (
          <Image source={{ uri: dream.image_url }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>Painting...</Text>
          </View>
        )}

        {/* Text */}
        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={2}>{dream.title || 'Untitled Dream'}</Text>
          <Text style={styles.preview} numberOfLines={2}>{dream.journal_text}</Text>
          <Text style={styles.date}>
            {new Date(dream.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  spine: { width: 4 },
  content: { flex: 1, flexDirection: 'row' },
  image: { width: 80, height: 100 },
  imagePlaceholder: { backgroundColor: colors.bgDark, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic' },
  textContent: { flex: 1, padding: spacing.sm },
  title: { fontFamily: fonts.serif, fontSize: 16, color: colors.textPrimary, marginBottom: 4 },
  preview: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  date: { fontSize: 11, color: colors.textMuted },
});
```

- [ ] **Step 2: Create MonthHeader component**

Create `components/journal/MonthHeader.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '@/constants/theme';

interface MonthHeaderProps {
  month: string;
  year: number;
  count: number;
}

export function MonthHeader({ month, year, count }: MonthHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{month} {year}</Text>
      <Text style={styles.count}>{count} {count === 1 ? 'dream' : 'dreams'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.md },
  text: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary },
  count: { fontSize: 13, color: colors.textMuted },
});
```

- [ ] **Step 3: Build the journal screen**

Replace `app/(tabs)/journal.tsx`:

```typescript
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDreams } from '@/hooks/useDreams';
import { DreamCard } from '@/components/journal/DreamCard';
import { MonthHeader } from '@/components/journal/MonthHeader';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Dream } from '@/types/database';

type ListItem = { type: 'header'; month: string; year: number; count: number } | { type: 'dream'; dream: Dream };

function groupDreamsByMonth(dreams: Dream[]): ListItem[] {
  const items: ListItem[] = [];
  let currentKey = '';

  for (const dream of dreams) {
    const date = new Date(dream.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (key !== currentKey) {
      currentKey = key;
      const monthDreams = dreams.filter(d => {
        const dd = new Date(d.created_at);
        return dd.getFullYear() === date.getFullYear() && dd.getMonth() === date.getMonth();
      });
      items.push({
        type: 'header',
        month: date.toLocaleDateString('en-US', { month: 'long' }),
        year: date.getFullYear(),
        count: monthDreams.length,
      });
    }
    items.push({ type: 'dream', dream });
  }

  return items;
}

export default function JournalScreen() {
  const { dreams, loading, fetchDreams } = useDreams();
  const items = groupDreamsByMonth(dreams);

  if (!loading && dreams.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Your dream journal is empty.{'\n'}Record your first dream to begin.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>Dream Journal</Text>
      <FlatList
        data={items}
        keyExtractor={(item, index) => item.type === 'header' ? `h-${index}` : `d-${(item as any).dream.id}`}
        renderItem={({ item }) =>
          item.type === 'header'
            ? <MonthHeader month={item.month} year={item.year} count={item.count} />
            : <DreamCard dream={item.dream} />
        }
        onRefresh={fetchDreams}
        refreshing={loading}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  screenTitle: { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { paddingBottom: 100 },
  empty: { fontFamily: fonts.serif, fontSize: 18, color: colors.textMuted, textAlign: 'center', marginTop: 100, lineHeight: 28, fontStyle: 'italic' },
});
```

- [ ] **Step 4: Commit**

```bash
git add components/journal/ app/(tabs)/journal.tsx
git commit -m "feat: add journal gallery with dream cards and month grouping"
```

---

## Phase 2: Engagement Features

*After this phase: full interactive experience with Go Deeper, My World, Shadow Work, Dream Map*

---

### Task 12: Go Deeper Conversation

**Files:**
- Create: `supabase/functions/go-deeper/index.ts`
- Create: `components/interpretation/GoDeeper.tsx`
- Modify: `app/dream/[id].tsx` to include Go Deeper

- [ ] **Step 1: Write go-deeper edge function**

Create `supabase/functions/go-deeper/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT = `You are a warm, wise Jungian dream analyst continuing a conversation about a dream. You ask Socratic questions — never leading ones. You draw connections to the dreamer's life context and previous dreams when relevant. You speak with metaphor and poetic insight. Keep responses to 2-4 sentences — brief, evocative, and thought-provoking.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { dream_id, message } = await req.json();

    // Fetch dream + existing conversation
    const [dreamRes, convRes, profileRes] = await Promise.all([
      supabase.from('dreams').select('title, journal_text, interpretation').eq('id', dream_id).single(),
      supabase.from('dream_conversations').select('role, content').eq('dream_id', dream_id).order('exchange_number'),
      supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
    ]);

    const dream = dreamRes.data;
    const conversation = convRes.data || [];
    const isPremium = profileRes.data?.subscription_tier === 'premium';
    const maxExchanges = isPremium ? 10 : 5;

    // Count existing user messages
    const userMessageCount = conversation.filter((c: any) => c.role === 'user').length;
    if (userMessageCount >= maxExchanges) {
      return new Response(JSON.stringify({ error: 'Exchange limit reached', limit: maxExchanges }), { status: 429 });
    }

    // Build messages for Claude
    const messages: { role: string; content: string }[] = [
      { role: 'user', content: `Dream: "${dream.journal_text}"\n\nInitial interpretation: ${dream.interpretation}` },
    ];
    for (const c of conversation) {
      messages.push({ role: c.role, content: c.content });
    }
    messages.push({ role: 'user', content: message });

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, system: SYSTEM_PROMPT, messages }),
    });

    if (!aiResponse.ok) {
      return new Response(JSON.stringify({ error: 'AI call failed' }), { status: 502 });
    }

    const aiResult = await aiResponse.json();
    const reply = aiResult.content[0].text;

    // Save both messages to conversation
    const nextExchange = userMessageCount + 1;
    await supabase.from('dream_conversations').insert([
      { dream_id, role: 'user', content: message, exchange_number: nextExchange },
      { dream_id, role: 'assistant', content: reply, exchange_number: nextExchange },
    ]);

    return new Response(JSON.stringify({
      reply,
      exchange_number: nextExchange,
      remaining: maxExchanges - nextExchange,
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
```

- [ ] **Step 2: Create GoDeeper component**

Create `components/interpretation/GoDeeper.tsx`:

```typescript
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { callEdgeFunction } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { DreamConversation } from '@/types/database';

interface GoDeeperProps {
  dreamId: string;
}

export function GoDeeper({ dreamId }: GoDeeperProps) {
  const [messages, setMessages] = useState<DreamConversation[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  // Load existing conversation
  useEffect(() => {
    supabase
      .from('dream_conversations')
      .select('*')
      .eq('dream_id', dreamId)
      .order('exchange_number')
      .then(({ data }) => setMessages(data || []));
  }, [dreamId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setLoading(true);

    try {
      const result = await callEdgeFunction<{ reply: string; remaining: number }>('go-deeper', {
        dream_id: dreamId,
        message: text,
      });

      // Refresh conversation
      const { data } = await supabase
        .from('dream_conversations')
        .select('*')
        .eq('dream_id', dreamId)
        .order('exchange_number');
      setMessages(data || []);
      setRemaining(result.remaining);
    } catch (err) {
      const errMsg = (err as Error).message;
      if (errMsg.includes('limit reached')) {
        setRemaining(0);
      }
    }
    setLoading(false);
  }, [input, dreamId, loading]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Go Deeper</Text>

      {messages.map(msg => (
        <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.assistantText]}>
            {msg.content}
          </Text>
        </View>
      ))}

      {loading && (
        <Text style={styles.thinking}>Descending deeper...</Text>
      )}

      {remaining === 0 ? (
        <Text style={styles.limitText}>You've reached the depth limit for this dream.</Text>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your dream..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable style={styles.sendButton} onPress={sendMessage} disabled={loading || !input.trim()}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      )}

      {remaining !== null && remaining > 0 && (
        <Text style={styles.remainingText}>{remaining} exchanges remaining</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 16, color: colors.purple, fontStyle: 'italic', marginBottom: spacing.md },
  bubble: { padding: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.sm, maxWidth: '85%' },
  userBubble: { backgroundColor: colors.bgCardHover, alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: colors.bgCard, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: colors.textPrimary },
  assistantText: { fontFamily: fonts.serif, color: colors.textSecondary },
  thinking: { fontFamily: fonts.serif, color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.sm },
  limitText: { fontFamily: fonts.serif, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  input: { flex: 1, backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: colors.border, maxHeight: 100 },
  sendButton: { backgroundColor: colors.purple, borderRadius: borderRadius.md, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
  remainingText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.xs },
});
```

- [ ] **Step 3: Add GoDeeper to dream detail page**

Add this import to `app/dream/[id].tsx`:
```typescript
import { GoDeeper } from '@/components/interpretation/GoDeeper';
```

Add after the symbols section, before the closing `</ScrollView>`:
```typescript
      {/* Go Deeper conversation */}
      <View style={styles.divider} />
      <GoDeeper dreamId={id!} />
```

- [ ] **Step 4: Deploy and commit**

```bash
npx supabase functions deploy go-deeper
git add supabase/functions/go-deeper/ components/interpretation/ app/dream/
git commit -m "feat: add Go Deeper conversation with Claude Sonnet 4.6"
```

---

### Task 13: My World & Onboarding

**Files:**
- Create: `hooks/useWorldEntries.ts`
- Create: `components/my-world/WorldEntryCard.tsx`
- Create: `components/my-world/WorldEntryForm.tsx`
- Modify: `app/(tabs)/my-world.tsx`
- Modify: `app/(onboarding)/index.tsx`

- [ ] **Step 1: Create useWorldEntries hook**

Create `hooks/useWorldEntries.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { WorldEntry, WorldEntryCategory } from '@/types/database';

export function useWorldEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WorldEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('world_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = useCallback(async (entry: { category: WorldEntryCategory; name: string; description?: string; relationship?: string }) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('world_entries')
      .insert({ ...entry, user_id: user.id })
      .select()
      .single();
    if (data) setEntries(prev => [data, ...prev]);
    return { data, error };
  }, [user]);

  const deleteEntry = useCallback(async (id: string) => {
    await supabase.from('world_entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const byCategory = (cat: WorldEntryCategory) => entries.filter(e => e.category === cat);

  return { entries, loading, fetchEntries, addEntry, deleteEntry, byCategory };
}
```

- [ ] **Step 2: Create WorldEntryCard and WorldEntryForm**

Create `components/my-world/WorldEntryCard.tsx`:

```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { WorldEntry } from '@/types/database';

const CATEGORY_LABELS: Record<string, string> = { person: 'Person', place: 'Place', theme: 'Theme', life_event: 'Life Event' };

export function WorldEntryCard({ entry, onDelete }: { entry: WorldEntry; onDelete: (id: string) => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{entry.name}</Text>
        <Text style={styles.category}>{CATEGORY_LABELS[entry.category]}</Text>
      </View>
      {entry.description && <Text style={styles.desc}>{entry.description}</Text>}
      {entry.relationship && <Text style={styles.rel}>{entry.relationship}</Text>}
      {entry.ai_suggested && <Text style={styles.aiTag}>Suggested by Animus</Text>}
      <Pressable onPress={() => onDelete(entry.id)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>Remove</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontFamily: fonts.serif, fontSize: 16, color: colors.textPrimary },
  category: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase' },
  desc: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  rel: { fontSize: 13, color: colors.purple, fontStyle: 'italic', marginTop: 4 },
  aiTag: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  deleteBtn: { marginTop: 8, alignSelf: 'flex-end' },
  deleteText: { color: colors.textMuted, fontSize: 12 },
});
```

Create `components/my-world/WorldEntryForm.tsx`:

```typescript
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { WorldEntryCategory } from '@/types/database';

const CATEGORIES: { value: WorldEntryCategory; label: string }[] = [
  { value: 'person', label: 'Person' },
  { value: 'place', label: 'Place' },
  { value: 'theme', label: 'Theme' },
  { value: 'life_event', label: 'Life Event' },
];

interface WorldEntryFormProps {
  onSubmit: (entry: { category: WorldEntryCategory; name: string; description?: string; relationship?: string }) => Promise<any>;
  onCancel: () => void;
}

export function WorldEntryForm({ onSubmit, onCancel }: WorldEntryFormProps) {
  const [category, setCategory] = useState<WorldEntryCategory>('person');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSubmit({
      category,
      name: name.trim(),
      description: description.trim() || undefined,
      relationship: relationship.trim() || undefined,
    });
    setSaving(false);
    setName(''); setDescription(''); setRelationship('');
  };

  return (
    <View style={styles.form}>
      <View style={styles.categoryRow}>
        {CATEGORIES.map(c => (
          <Pressable key={c.value} style={[styles.categoryChip, category === c.value && styles.categoryActive]} onPress={() => setCategory(c.value)}>
            <Text style={[styles.categoryText, category === c.value && styles.categoryTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline />
      <TextInput style={styles.input} placeholder="Relationship (e.g. mother, childhood home)" placeholderTextColor={colors.textMuted} value={relationship} onChangeText={setRelationship} />
      <View style={styles.buttonRow}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={saving || !name.trim()}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Add'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  categoryRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md, flexWrap: 'wrap' },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  categoryActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  categoryText: { color: colors.textMuted, fontSize: 13 },
  categoryTextActive: { color: '#fff' },
  input: { backgroundColor: colors.bgDark, color: colors.textPrimary, borderRadius: borderRadius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: { padding: spacing.sm },
  cancelText: { color: colors.textMuted },
  saveBtn: { backgroundColor: colors.purple, borderRadius: borderRadius.sm, paddingHorizontal: 20, paddingVertical: 10 },
  saveText: { color: '#fff', fontWeight: '600' },
});
```

- [ ] **Step 3: Build My World screen**

Replace `app/(tabs)/my-world.tsx`:

```typescript
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useWorldEntries } from '@/hooks/useWorldEntries';
import { WorldEntryCard } from '@/components/my-world/WorldEntryCard';
import { WorldEntryForm } from '@/components/my-world/WorldEntryForm';
import { colors, fonts, spacing } from '@/constants/theme';

export default function MyWorldScreen() {
  const { entries, loading, fetchEntries, addEntry, deleteEntry } = useWorldEntries();
  const [showForm, setShowForm] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My World</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addText}>+ Add</Text>
        </Pressable>
      </View>

      {showForm && (
        <WorldEntryForm
          onSubmit={async (entry) => { await addEntry(entry); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <FlatList
        data={entries}
        keyExtractor={e => e.id}
        renderItem={({ item }) => <WorldEntryCard entry={item} onDelete={deleteEntry} />}
        onRefresh={fetchEntries}
        refreshing={loading}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Add the people, places, and themes that matter to you.{'\n'}This helps Animus interpret your dreams more personally.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary },
  addBtn: { backgroundColor: colors.bgCard, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  addText: { color: colors.purple, fontWeight: '500' },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  empty: { fontFamily: fonts.serif, fontSize: 16, color: colors.textMuted, textAlign: 'center', marginTop: 60, lineHeight: 24, fontStyle: 'italic', paddingHorizontal: spacing.lg },
});
```

- [ ] **Step 4: Enhance onboarding with guided flow**

Replace `app/(onboarding)/index.tsx`:

```typescript
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorldEntries } from '@/hooks/useWorldEntries';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

const STEPS = [
  { key: 'people', category: 'person' as const, title: 'Important people', prompt: 'Who appears in your life most prominently? Name a few key people and their relationship to you.', placeholder: 'e.g., Sarah — partner, Dad — distant but loving' },
  { key: 'places', category: 'place' as const, title: 'Meaningful places', prompt: 'Which places carry emotional weight for you? Childhood homes, cities, recurring dream locations...', placeholder: 'e.g., Grandma\'s farm — safety, the ocean — freedom' },
  { key: 'themes', category: 'theme' as const, title: 'Life themes', prompt: 'What themes dominate your inner life right now? What keeps you up at night or inspires you?', placeholder: 'e.g., career change — excitement and fear' },
];

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const { addEntry } = useWorldEntries();
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const handleNext = async () => {
    // Parse and save entries from current step
    const currentStep = STEPS[step];
    const text = inputs[currentStep.key] || '';
    if (text.trim()) {
      const lines = text.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const [name, ...descParts] = line.split('—').map(s => s.trim());
        if (name) await addEntry({ category: currentStep.category, name, description: descParts.join(' — ') || undefined });
      }
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    if (user) {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
      await refreshProfile();
    }
    router.replace('/(tabs)/record');
  };

  const current = STEPS[step];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.stepCount}>{step + 1} of {STEPS.length}</Text>
      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.prompt}>{current.prompt}</Text>
      <Text style={styles.hint}>One per line. Use — to add a description.</Text>

      <TextInput
        style={styles.input}
        placeholder={current.placeholder}
        placeholderTextColor={colors.textMuted}
        value={inputs[current.key] || ''}
        onChangeText={t => setInputs({ ...inputs, [current.key]: t })}
        multiline
        numberOfLines={5}
      />

      <View style={styles.buttonRow}>
        <Pressable style={styles.skipBtn} onPress={step < STEPS.length - 1 ? () => setStep(step + 1) : finishOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>{step < STEPS.length - 1 ? 'Next' : 'Begin'}</Text>
        </Pressable>
      </View>

      <Pressable onPress={finishOnboarding} style={styles.skipAllBtn}>
        <Text style={styles.skipAllText}>Skip all — I'll add these later</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  content: { padding: spacing.xl, paddingTop: 80 },
  stepCount: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary, marginBottom: spacing.sm },
  prompt: { fontSize: 16, color: colors.textSecondary, lineHeight: 24, marginBottom: spacing.xs },
  hint: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.lg },
  input: { backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16, lineHeight: 24, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  skipBtn: { padding: spacing.md },
  skipText: { color: colors.textMuted, fontSize: 16 },
  nextBtn: { backgroundColor: colors.purple, borderRadius: borderRadius.md, paddingHorizontal: 32, paddingVertical: 14 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipAllBtn: { marginTop: spacing.xl, alignSelf: 'center' },
  skipAllText: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'underline' },
});
```

- [ ] **Step 5: Commit**

```bash
git add hooks/useWorldEntries.ts components/my-world/ app/(tabs)/my-world.tsx app/(onboarding)/
git commit -m "feat: add My World screen, world entry CRUD, and onboarding flow"
```

---

### Task 14: Shadow Work

**Files:**
- Create: `supabase/functions/shadow-exercise/index.ts`
- Create: `hooks/useShadowExercises.ts`
- Create: `components/shadow/ExerciseCard.tsx`
- Create: `components/shadow/ExerciseSheet.tsx`
- Modify: `app/(tabs)/shadow-work.tsx`

- [ ] **Step 1: Write shadow-exercise edge function**

Create `supabase/functions/shadow-exercise/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT = `You are a Jungian shadow work facilitator. Generate a single shadow work exercise prompt. The prompt should be:
- Introspective and personally confronting but never aggressive
- Framed as "diving deeper beneath the surface"
- Connected to the dream symbols if provided
- 2-4 sentences maximum
- End with a question the user can journal about

Respond with ONLY the exercise prompt text, no JSON or formatting.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { dream_id, symbols } = await req.json();

    let context = '';
    if (symbols?.length) {
      context = `\n\nDream symbols to weave into the exercise: ${symbols.map((s: any) => s.symbol).join(', ')}`;
    }

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 200, system: SYSTEM_PROMPT + context, messages: [{ role: 'user', content: 'Generate a shadow work exercise.' }] }),
    });

    const aiResult = await aiResponse.json();
    const prompt = aiResult.content[0].text;

    // Save exercise
    const { data: exercise } = await supabase
      .from('shadow_exercises')
      .insert({ user_id: user.id, dream_id: dream_id || null, prompt })
      .select()
      .single();

    return new Response(JSON.stringify(exercise), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
```

- [ ] **Step 2: Create hook, components, and screen**

Create `hooks/useShadowExercises.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { callEdgeFunction } from '@/lib/ai';
import { useAuth } from '@/hooks/useAuth';
import type { ShadowExercise } from '@/types/database';

export function useShadowExercises() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<ShadowExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExercises = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('shadow_exercises').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    setExercises(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  const generateExercise = useCallback(async (dreamId?: string, symbols?: any[]) => {
    const exercise = await callEdgeFunction<ShadowExercise>('shadow-exercise', { dream_id: dreamId, symbols });
    setExercises(prev => [exercise, ...prev]);
    return exercise;
  }, []);

  const saveResponse = useCallback(async (exerciseId: string, response: string) => {
    await supabase.from('shadow_exercises').update({ response }).eq('id', exerciseId);
    setExercises(prev => prev.map(e => e.id === exerciseId ? { ...e, response } : e));
  }, []);

  return { exercises, loading, fetchExercises, generateExercise, saveResponse };
}
```

Create `components/shadow/ExerciseCard.tsx`:

```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { ShadowExercise } from '@/types/database';

export function ExerciseCard({ exercise, onTap }: { exercise: ShadowExercise; onTap: () => void }) {
  const hasResponse = !!exercise.response;
  return (
    <Pressable style={[styles.card, hasResponse && styles.cardCompleted]} onPress={onTap}>
      <Text style={styles.prompt} numberOfLines={3}>{exercise.prompt}</Text>
      {hasResponse && <Text style={styles.completed}>Explored</Text>}
      <Text style={styles.date}>{new Date(exercise.created_at).toLocaleDateString()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardCompleted: { borderColor: colors.purpleDim },
  prompt: { fontFamily: fonts.serif, fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  completed: { color: colors.purple, fontSize: 12, marginTop: spacing.xs, fontStyle: 'italic' },
  date: { color: colors.textMuted, fontSize: 11, marginTop: spacing.xs },
});
```

Create `components/shadow/ExerciseSheet.tsx`:

```typescript
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface ExerciseSheetProps {
  prompt: string;
  existingResponse?: string | null;
  onSave: (response: string) => void;
  onClose: () => void;
}

export function ExerciseSheet({ prompt, existingResponse, onSave, onClose }: ExerciseSheetProps) {
  const [response, setResponse] = useState(existingResponse || '');

  return (
    <View style={styles.sheet}>
      <Text style={styles.label}>Dive deeper</Text>
      <Text style={styles.prompt}>{prompt}</Text>
      <TextInput
        style={styles.input}
        placeholder="Write your reflection..."
        placeholderTextColor={colors.textMuted}
        value={response}
        onChangeText={setResponse}
        multiline
        numberOfLines={8}
        autoFocus
      />
      <View style={styles.buttonRow}>
        <Pressable style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>Close</Text></Pressable>
        <Pressable style={styles.saveBtn} onPress={() => { onSave(response); onClose(); }}>
          <Text style={styles.saveText}>Save reflection</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.bgDark, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.border },
  label: { fontFamily: fonts.serif, fontSize: 14, color: colors.purple, fontStyle: 'italic', marginBottom: spacing.sm },
  prompt: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, lineHeight: 28, marginBottom: spacing.lg },
  input: { backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16, lineHeight: 24, minHeight: 150, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  closeBtn: { padding: spacing.sm },
  closeText: { color: colors.textMuted },
  saveBtn: { backgroundColor: colors.purple, borderRadius: borderRadius.md, paddingHorizontal: 24, paddingVertical: 12 },
  saveText: { color: '#fff', fontWeight: '600' },
});
```

- [ ] **Step 3: Build Shadow Work screen**

Replace `app/(tabs)/shadow-work.tsx`:

```typescript
import { View, Text, FlatList, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useShadowExercises } from '@/hooks/useShadowExercises';
import { ExerciseCard } from '@/components/shadow/ExerciseCard';
import { ExerciseSheet } from '@/components/shadow/ExerciseSheet';
import { colors, fonts, spacing } from '@/constants/theme';
import type { ShadowExercise } from '@/types/database';

export default function ShadowWorkScreen() {
  const { exercises, loading, fetchExercises, generateExercise, saveResponse } = useShadowExercises();
  const [activeExercise, setActiveExercise] = useState<ShadowExercise | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try { await generateExercise(); } catch (err) { console.warn(err); }
    setGenerating(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Shadow Work</Text>
      <Text style={styles.subtitle}>Dive beneath the surface</Text>

      <Pressable style={[styles.generateBtn, generating && { opacity: 0.6 }]} onPress={handleGenerate} disabled={generating}>
        <Text style={styles.generateText}>{generating ? 'Surfacing an exercise...' : 'New exercise'}</Text>
      </Pressable>

      <FlatList
        data={exercises}
        keyExtractor={e => e.id}
        renderItem={({ item }) => <ExerciseCard exercise={item} onTap={() => setActiveExercise(item)} />}
        onRefresh={fetchExercises}
        refreshing={loading}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Shadow exercises will appear here.{'\n'}Tap "New exercise" to begin.</Text>}
      />

      <Modal visible={!!activeExercise} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          {activeExercise && (
            <ExerciseSheet
              prompt={activeExercise.prompt}
              existingResponse={activeExercise.response}
              onSave={(text) => saveResponse(activeExercise.id, text)}
              onClose={() => setActiveExercise(null)}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  subtitle: { fontFamily: fonts.serif, fontSize: 14, color: colors.purple, fontStyle: 'italic', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  generateBtn: { backgroundColor: colors.bgCard, borderRadius: 12, paddingVertical: 14, marginHorizontal: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  generateText: { color: colors.purple, textAlign: 'center', fontWeight: '500' },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  empty: { fontFamily: fonts.serif, fontSize: 16, color: colors.textMuted, textAlign: 'center', marginTop: 60, lineHeight: 24, fontStyle: 'italic' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
});
```

- [ ] **Step 4: Deploy and commit**

```bash
npx supabase functions deploy shadow-exercise
git add supabase/functions/shadow-exercise/ hooks/useShadowExercises.ts components/shadow/ app/(tabs)/shadow-work.tsx
git commit -m "feat: add shadow work exercises with AI-generated prompts"
```

---

### Task 15: Heatmap Calendar

**Files:**
- Create: `components/dream-map/HeatmapCalendar.tsx`
- Modify: `app/(tabs)/dream-map.tsx`

- [ ] **Step 1: Create HeatmapCalendar component**

Create `components/dream-map/HeatmapCalendar.tsx`:

```typescript
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Dream } from '@/types/database';

interface HeatmapCalendarProps {
  dreams: Dream[];
  streakCurrent: number;
  streakLongest: number;
}

export function HeatmapCalendar({ dreams, streakCurrent, streakLongest }: HeatmapCalendarProps) {
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // Show ~52 weeks

    // Build dream count by date
    const dreamsByDate: Record<string, Dream[]> = {};
    for (const d of dreams) {
      const key = new Date(d.created_at).toISOString().split('T')[0];
      if (!dreamsByDate[key]) dreamsByDate[key] = [];
      dreamsByDate[key].push(d);
    }

    // Build 7-row grid (Sun=0 to Sat=6)
    const weeks: { date: Date; count: number; dreams: Dream[] }[][] = [];
    let currentWeek: { date: Date; count: number; dreams: Dream[] }[] = [];
    const labels: { text: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    // Align to start of week (Sunday)
    cursor.setDate(cursor.getDate() - cursor.getDay());

    let weekIndex = 0;
    while (cursor <= today || currentWeek.length > 0) {
      const key = cursor.toISOString().split('T')[0];
      const dayDreams = dreamsByDate[key] || [];
      currentWeek.push({ date: new Date(cursor), count: dayDreams.length, dreams: dayDreams });

      if (cursor.getMonth() !== lastMonth) {
        labels.push({ text: cursor.toLocaleDateString('en-US', { month: 'short' }), weekIndex });
        lastMonth = cursor.getMonth();
      }

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
        weekIndex++;
      }

      cursor.setDate(cursor.getDate() + 1);
      if (cursor > today && currentWeek.length === 0) break;
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return { grid: weeks, monthLabels: labels };
  }, [dreams]);

  const getColor = (count: number) => {
    if (count === 0) return colors.bgCard;
    if (count === 1) return colors.purpleDim;
    if (count === 2) return colors.purple;
    return '#b88aee'; // Bright purple for 3+
  };

  return (
    <View>
      {/* Streak stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{streakCurrent}</Text>
          <Text style={styles.statLabel}>Current streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{streakLongest}</Text>
          <Text style={styles.statLabel}>Longest streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{dreams.length}</Text>
          <Text style={styles.statLabel}>Total dreams</Text>
        </View>
      </View>

      {/* Month labels */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.monthRow}>
            {monthLabels.map((label, i) => (
              <Text key={i} style={[styles.monthLabel, { left: label.weekIndex * 14 }]}>{label.text}</Text>
            ))}
          </View>

          {/* Grid: 7 rows (days of week) x N columns (weeks) */}
          {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
            <View key={dayIndex} style={styles.gridRow}>
              {grid.map((week, weekIndex) => {
                const day = week[dayIndex];
                if (!day) return <View key={weekIndex} style={styles.cell} />;
                return (
                  <Pressable
                    key={weekIndex}
                    style={[styles.cell, { backgroundColor: getColor(day.count) }]}
                    onPress={() => {
                      if (day.dreams.length === 1) {
                        router.push({ pathname: '/dream/[id]', params: { id: day.dreams[0].id } });
                      }
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, color: colors.textPrimary, fontWeight: '600' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  monthRow: { height: 20, position: 'relative', marginLeft: 4 },
  monthLabel: { position: 'absolute', fontSize: 10, color: colors.textMuted },
  gridRow: { flexDirection: 'row', gap: 2 },
  cell: { width: 12, height: 12, borderRadius: 2, backgroundColor: colors.bgCard },
});
```

- [ ] **Step 2: Build Dream Map screen with tab toggle**

Replace `app/(tabs)/dream-map.tsx`:

```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useDreams } from '@/hooks/useDreams';
import { useAuth } from '@/hooks/useAuth';
import { HeatmapCalendar } from '@/components/dream-map/HeatmapCalendar';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

type ViewMode = 'calendar' | 'web';

export default function DreamMapScreen() {
  const { dreams, loading } = useDreams();
  const { profile } = useAuth();
  const [view, setView] = useState<ViewMode>('calendar');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Dream Map</Text>

      {/* Toggle */}
      <View style={styles.toggle}>
        <Pressable style={[styles.toggleBtn, view === 'calendar' && styles.toggleActive]} onPress={() => setView('calendar')}>
          <Text style={[styles.toggleText, view === 'calendar' && styles.toggleTextActive]}>Calendar</Text>
        </Pressable>
        <Pressable style={[styles.toggleBtn, view === 'web' && styles.toggleActive]} onPress={() => setView('web')}>
          <Text style={[styles.toggleText, view === 'web' && styles.toggleTextActive]}>Dream Web</Text>
        </Pressable>
      </View>

      {view === 'calendar' ? (
        <HeatmapCalendar
          dreams={dreams}
          streakCurrent={profile?.streak_current || 0}
          streakLongest={profile?.streak_longest || 0}
        />
      ) : (
        <View style={styles.webPlaceholder}>
          <Text style={styles.webText}>Dream Web — coming in Task 16</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  toggle: { flexDirection: 'row', marginHorizontal: spacing.lg, marginVertical: spacing.md, backgroundColor: colors.bgCard, borderRadius: borderRadius.sm, padding: 2 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm - 2, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.purple },
  toggleText: { color: colors.textMuted, fontSize: 14 },
  toggleTextActive: { color: '#fff', fontWeight: '500' },
  webPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  webText: { color: colors.textMuted, fontStyle: 'italic' },
});
```

- [ ] **Step 3: Commit**

```bash
git add components/dream-map/HeatmapCalendar.tsx app/(tabs)/dream-map.tsx
git commit -m "feat: add heatmap calendar with streak stats and dream map screen"
```

---

### Task 16: Dream Web Constellation (react-native-skia)

**Files:**
- Create: `components/dream-map/DreamWeb.tsx`
- Modify: `app/(tabs)/dream-map.tsx` to wire up Dream Web

This is the hardest technical component. It uses `@shopify/react-native-skia` to render an interactive force-directed graph where dreams are stars clustered by archetype/theme.

- [ ] **Step 1: Create DreamWeb component**

Create `components/dream-map/DreamWeb.tsx`:

```typescript
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Line, vec, useValue, useTouchHandler, Group, Text as SkiaText, useFont } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import type { Dream, DreamSymbol } from '@/types/database';

interface DreamNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  cluster: string;
  dream: Dream;
}

interface DreamWebProps {
  dreams: Dream[];
  symbols: DreamSymbol[];
}

export function DreamWeb({ dreams, symbols }: DreamWebProps) {
  const { width, height } = useWindowDimensions();
  const canvasHeight = height - 250; // Account for header/tabs
  const [nodes, setNodes] = useState<DreamNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);

  // Cluster dreams by their dominant archetype
  const clusterMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sym of symbols) {
      if (!map[sym.dream_id] && sym.archetype) {
        map[sym.dream_id] = sym.archetype;
      }
    }
    return map;
  }, [symbols]);

  // Cluster center positions
  const clusterCenters = useMemo(() => {
    const uniqueClusters = [...new Set(Object.values(clusterMap))];
    const centers: Record<string, { x: number; y: number }> = {};
    const cx = width / 2;
    const cy = canvasHeight / 2;
    const radius = Math.min(width, canvasHeight) * 0.3;

    uniqueClusters.forEach((cluster, i) => {
      const angle = (2 * Math.PI * i) / uniqueClusters.length - Math.PI / 2;
      centers[cluster] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
    // Default cluster for dreams with no archetype
    centers['Unknown'] = { x: cx, y: cy };
    return centers;
  }, [clusterMap, width, canvasHeight]);

  // Initialize nodes
  useEffect(() => {
    const newNodes: DreamNode[] = dreams.map((dream, i) => {
      const cluster = clusterMap[dream.id] || 'Unknown';
      const center = clusterCenters[cluster] || { x: width / 2, y: canvasHeight / 2 };
      // Random offset from cluster center
      const angle = Math.random() * 2 * Math.PI;
      const dist = 20 + Math.random() * 40;
      return {
        id: dream.id,
        x: center.x + dist * Math.cos(angle),
        y: center.y + dist * Math.sin(angle),
        vx: 0,
        vy: 0,
        cluster,
        dream,
      };
    });
    setNodes(newNodes);
  }, [dreams, clusterMap, clusterCenters, width, canvasHeight]);

  // Simple force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    let running = true;
    let iteration = 0;
    const maxIterations = 100;

    const simulate = () => {
      if (!running || iteration >= maxIterations) return;
      iteration++;

      setNodes(prev => {
        const next = prev.map(n => ({ ...n }));

        for (let i = 0; i < next.length; i++) {
          const node = next[i];
          const center = clusterCenters[node.cluster] || { x: width / 2, y: canvasHeight / 2 };

          // Pull toward cluster center
          node.vx += (center.x - node.x) * 0.01;
          node.vy += (center.y - node.y) * 0.01;

          // Repel from other nodes
          for (let j = 0; j < next.length; j++) {
            if (i === j) continue;
            const dx = node.x - next[j].x;
            const dy = node.y - next[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 40) {
              const force = (40 - dist) / dist * 0.5;
              node.vx += dx * force;
              node.vy += dy * force;
            }
          }

          // Apply velocity with damping
          node.x += node.vx * 0.3;
          node.y += node.vy * 0.3;
          node.vx *= 0.8;
          node.vy *= 0.8;

          // Keep in bounds
          node.x = Math.max(20, Math.min(width - 20, node.x));
          node.y = Math.max(20, Math.min(canvasHeight - 20, node.y));
        }

        return next;
      });

      animFrameRef.current = requestAnimationFrame(simulate);
    };

    animFrameRef.current = requestAnimationFrame(simulate);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, [nodes.length, clusterCenters, width, canvasHeight]);

  // Find edges: dreams in same cluster
  const edges = useMemo(() => {
    const result: { from: DreamNode; to: DreamNode; sameCluster: boolean }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].cluster === nodes[j].cluster && nodes[i].cluster !== 'Unknown') {
          result.push({ from: nodes[i], to: nodes[j], sameCluster: true });
        }
      }
    }
    return result;
  }, [nodes]);

  const handleTouch = useTouchHandler({
    onEnd: (pt) => {
      // Find nearest node
      let closest: DreamNode | null = null;
      let closestDist = 30; // tap radius
      for (const node of nodes) {
        const dist = Math.sqrt((pt.x - node.x) ** 2 + (pt.y - node.y) ** 2);
        if (dist < closestDist) {
          closest = node;
          closestDist = dist;
        }
      }
      if (closest) {
        router.push({ pathname: '/dream/[id]', params: { id: closest.id } });
      }
    },
  });

  if (dreams.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Your Dream Web will grow as you record dreams.</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height: canvasHeight }}>
      <Canvas style={{ width, height: canvasHeight }} onTouch={handleTouch}>
        {/* Edges */}
        {edges.map((edge, i) => (
          <Line
            key={`e-${i}`}
            p1={vec(edge.from.x, edge.from.y)}
            p2={vec(edge.to.x, edge.to.y)}
            color={edge.sameCluster ? 'rgba(147, 112, 219, 0.15)' : 'rgba(147, 112, 219, 0.05)'}
            strokeWidth={1}
          />
        ))}

        {/* Cluster labels */}
        {Object.entries(clusterCenters).map(([name, pos]) => (
          <SkiaText key={`cl-${name}`} x={pos.x - 20} y={pos.y - 50} text={name} color={colors.textMuted} />
        ))}

        {/* Nodes (stars) */}
        {nodes.map(node => (
          <Group key={node.id}>
            {/* Glow */}
            <Circle cx={node.x} cy={node.y} r={8} color="rgba(147, 112, 219, 0.2)" />
            {/* Star */}
            <Circle cx={node.x} cy={node.y} r={4} color={colors.purple} />
            {/* Bright center */}
            <Circle cx={node.x} cy={node.y} r={1.5} color={colors.textPrimary} />
          </Group>
        ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
```

- [ ] **Step 2: Wire DreamWeb into dream-map screen**

In `app/(tabs)/dream-map.tsx`, add the import:
```typescript
import { DreamWeb } from '@/components/dream-map/DreamWeb';
```

And add a state for symbols + fetch them:
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { DreamSymbol } from '@/types/database';
```

Inside the component, add:
```typescript
const [symbols, setSymbols] = useState<DreamSymbol[]>([]);
const { user } = useAuth();

useEffect(() => {
  if (!user) return;
  supabase.from('dream_symbols').select('*').eq('user_id', user.id)
    .then(({ data }) => setSymbols(data || []));
}, [user]);
```

Replace the `webPlaceholder` view with:
```typescript
<DreamWeb dreams={dreams} symbols={symbols} />
```

- [ ] **Step 3: Test Dream Web**

Record 5+ dreams to see the constellation form clusters. Verify tap-to-open works.

- [ ] **Step 4: Commit**

```bash
git add components/dream-map/DreamWeb.tsx app/(tabs)/dream-map.tsx
git commit -m "feat: add Dream Web constellation visualization with force-directed layout"
```

---

## Phase 3: Monetization & Premium

*After this phase: revenue-generating, polished app ready for app stores*

---

### Task 17: Ads Integration & Usage Limits

**Files:**
- Create: `lib/ads.ts`
- Create: `components/ads/AdGate.tsx`
- Create: `components/ads/NativeAdCard.tsx`
- Create: `hooks/useUsageLimits.ts`

- [ ] **Step 1: Create ads initialization**

Create `lib/ads.ts`:

```typescript
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

export const AD_UNIT_IDS = {
  interstitial: __DEV__ ? 'ca-app-pub-3940256099942544/1033173712' : 'YOUR_PROD_INTERSTITIAL_ID',
  native: __DEV__ ? 'ca-app-pub-3940256099942544/2247696110' : 'YOUR_PROD_NATIVE_ID',
};

export async function initializeAds() {
  await mobileAds().initialize();
  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
}
```

- [ ] **Step 2: Create usage limits hook**

Create `hooks/useUsageLimits.ts`:

```typescript
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { LimitType } from '@/types/database';

const LIMITS = {
  free: { go_deeper: 5, image_refinement: 1, shadow_exercise: 3, dream_connection: 999, dream_insights: 1 },
  premium: { go_deeper: 10, image_refinement: 3, shadow_exercise: 5, dream_connection: 999, dream_insights: 999 },
};

export function useUsageLimits() {
  const { user, profile } = useAuth();
  const tier = profile?.subscription_tier || 'free';

  const checkLimit = useCallback(async (limitType: LimitType, dreamId?: string): Promise<{ allowed: boolean; remaining: number }> => {
    if (!user) return { allowed: false, remaining: 0 };

    const maxCount = LIMITS[tier][limitType];
    const isDailyLimit = limitType === 'shadow_exercise';

    let query = supabase.from('usage_limits').select('count').eq('user_id', user.id).eq('limit_type', limitType);

    if (isDailyLimit) {
      query = query.eq('period_date', new Date().toISOString().split('T')[0]);
    } else if (dreamId) {
      query = query.eq('dream_id', dreamId);
    }

    const { data } = await query.maybeSingle();
    const currentCount = data?.count || 0;

    return { allowed: currentCount < maxCount, remaining: maxCount - currentCount };
  }, [user, tier]);

  const incrementLimit = useCallback(async (limitType: LimitType, dreamId?: string) => {
    if (!user) return;

    const isDailyLimit = limitType === 'shadow_exercise';
    const today = new Date().toISOString().split('T')[0];

    // Upsert: increment if exists, insert with count=1 if not
    const { data: existing } = await supabase.from('usage_limits')
      .select('id, count')
      .eq('user_id', user.id)
      .eq('limit_type', limitType)
      .eq(isDailyLimit ? 'period_date' : 'dream_id', isDailyLimit ? today : dreamId!)
      .maybeSingle();

    if (existing) {
      await supabase.from('usage_limits').update({ count: existing.count + 1, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('usage_limits').insert({
        user_id: user.id,
        dream_id: isDailyLimit ? null : dreamId,
        limit_type: limitType,
        count: 1,
        period_date: isDailyLimit ? today : null,
      });
    }
  }, [user]);

  return { checkLimit, incrementLimit, tier };
}
```

- [ ] **Step 3: Create AdGate component**

Create `components/ads/AdGate.tsx`:

```typescript
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '@/lib/ads';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

const TRANSPARENT_MESSAGES = [
  'This ad keeps Animus free. AI dreams aren\'t cheap \u2014 thank you for supporting us.',
  'Dream interpretation and image generation cost real money. This ad helps us keep Animus open to everyone.',
  'You\'re about to go deeper. This ad helps us keep the lights on so everyone can explore their dreams.',
];

interface AdGateProps {
  children: React.ReactNode;
  onAdComplete: () => void;
  actionLabel?: string;
}

export function AdGate({ children, onAdComplete, actionLabel = 'Continue' }: AdGateProps) {
  const { profile } = useAuth();
  const [adLoaded, setAdLoaded] = useState(false);
  const [showingMessage, setShowingMessage] = useState(false);
  const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);

  // Premium users skip ads entirely
  if (profile?.subscription_tier === 'premium') {
    return <>{children}</>;
  }

  const message = TRANSPARENT_MESSAGES[Math.floor(Math.random() * TRANSPARENT_MESSAGES.length)];

  useEffect(() => {
    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);

    const loadListener = ad.addAdEventListener(AdEventType.LOADED, () => setAdLoaded(true));
    const closeListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
      onAdComplete();
      setShowingMessage(false);
    });

    ad.load();
    setInterstitial(ad);

    return () => { loadListener(); closeListener(); };
  }, [onAdComplete]);

  const handlePress = useCallback(() => {
    if (!showingMessage) {
      setShowingMessage(true);
      return;
    }
    if (adLoaded && interstitial) {
      interstitial.show();
    } else {
      // Ad failed to load — let them through anyway
      onAdComplete();
    }
  }, [showingMessage, adLoaded, interstitial, onAdComplete]);

  if (showingMessage) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.message}>{message}</Text>
        <Pressable style={styles.continueBtn} onPress={handlePress}>
          <Text style={styles.continueText}>
            {adLoaded ? actionLabel : 'Loading...'}
          </Text>
          {!adLoaded && <ActivityIndicator size="small" color={colors.purple} style={{ marginLeft: 8 }} />}
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable onPress={handlePress}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  messageContainer: { padding: spacing.lg, alignItems: 'center' },
  message: { fontFamily: fonts.serif, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg, fontStyle: 'italic' },
  continueBtn: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: borderRadius.md, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  continueText: { color: colors.purple, fontWeight: '500' },
});
```

- [ ] **Step 4: Initialize ads in root layout**

Add to `app/_layout.tsx`, inside `RootLayout` before the return:
```typescript
import { initializeAds } from '@/lib/ads';

useEffect(() => { initializeAds(); }, []);
```

- [ ] **Step 5: Commit**

```bash
git add lib/ads.ts hooks/useUsageLimits.ts components/ads/
git commit -m "feat: add ads integration, usage limits, and AdGate component"
```

---

### Task 18: Subscription & Premium Gates

**Files:**
- Create: `contexts/SubscriptionContext.tsx`
- Create: `hooks/useSubscription.ts`
- Create: `components/premium/PremiumGate.tsx`
- Create: `app/settings.tsx`

- [ ] **Step 1: Create SubscriptionContext with RevenueCat**

Create `contexts/SubscriptionContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionState {
  isPremium: boolean;
  packages: PurchasesPackage[];
  loading: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

const REVENUECAT_API_KEY = Platform.select({
  ios: 'YOUR_REVENUECAT_IOS_KEY',
  android: 'YOUR_REVENUECAT_ANDROID_KEY',
}) || '';

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      if (user) await Purchases.logIn(user.id);
      await checkPremiumStatus();
      await loadPackages();
      setLoading(false);
    }
    init();
  }, [user]);

  async function checkPremiumStatus() {
    try {
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      const premium = info.entitlements.active['premium'] !== undefined;
      setIsPremium(premium);

      // Sync to Supabase
      if (user) {
        await supabase.from('profiles')
          .update({ subscription_tier: premium ? 'premium' : 'free' })
          .eq('id', user.id);
      }
    } catch {
      setIsPremium(false);
    }
  }

  async function loadPackages() {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) setPackages(offerings.current.availablePackages);
    } catch {}
  }

  const purchase = async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      await Purchases.purchasePackage(pkg);
      await checkPremiumStatus();
      await refreshProfile();
      return true;
    } catch { return false; }
  };

  const restore = async (): Promise<boolean> => {
    try {
      await Purchases.restorePurchases();
      await checkPremiumStatus();
      await refreshProfile();
      return isPremium;
    } catch { return false; }
  };

  return (
    <SubscriptionContext.Provider value={{ isPremium, packages, loading, purchase, restore }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
```

- [ ] **Step 2: Create PremiumGate component**

Create `components/premium/PremiumGate.tsx`:

```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
}

export function PremiumGate({ feature, children }: PremiumGateProps) {
  const { isPremium, packages, purchase } = useSubscription();

  if (isPremium) return <>{children}</>;

  const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium Feature</Text>
      <Text style={styles.desc}>{feature} is available with Animus Premium.</Text>
      {monthlyPkg && (
        <Pressable style={styles.upgradeBtn} onPress={() => purchase(monthlyPkg)}>
          <Text style={styles.upgradeText}>Upgrade — {monthlyPkg.product.priceString}/month</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, margin: spacing.lg, borderWidth: 1, borderColor: colors.purple },
  title: { fontFamily: fonts.serif, fontSize: 20, color: colors.textPrimary, marginBottom: spacing.sm },
  desc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  upgradeBtn: { backgroundColor: colors.purple, borderRadius: borderRadius.md, paddingHorizontal: 32, paddingVertical: 14 },
  upgradeText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
```

- [ ] **Step 3: Create settings screen**

Create `app/settings.tsx`:

```typescript
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const { isPremium, packages, purchase, restore } = useSubscription();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/sign-in'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.info}>{user?.email}</Text>
          <Text style={styles.info}>Status: {isPremium ? 'Premium' : 'Free'}</Text>
          <Text style={styles.info}>Dreams: {profile?.dream_count || 0}</Text>
        </View>

        {/* Subscription */}
        {!isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upgrade to Premium</Text>
            {packages.map(pkg => (
              <Pressable key={pkg.identifier} style={styles.pkgBtn} onPress={() => purchase(pkg)}>
                <Text style={styles.pkgText}>{pkg.product.title} — {pkg.product.priceString}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.restoreBtn} onPress={restore}>
              <Text style={styles.restoreText}>Restore purchases</Text>
            </Pressable>
          </View>
        )}

        {/* Sign out */}
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  content: { padding: spacing.lg, paddingBottom: 100 },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary, marginBottom: spacing.lg },
  section: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 16, color: colors.purple, marginBottom: spacing.sm },
  info: { color: colors.textSecondary, fontSize: 14, marginBottom: 4 },
  pkgBtn: { backgroundColor: colors.purple, borderRadius: borderRadius.sm, paddingVertical: 12, marginTop: spacing.sm, alignItems: 'center' },
  pkgText: { color: '#fff', fontWeight: '600' },
  restoreBtn: { marginTop: spacing.sm, alignItems: 'center', padding: spacing.sm },
  restoreText: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
  signOutBtn: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, paddingVertical: 14, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.error },
  signOutText: { color: colors.error, textAlign: 'center', fontWeight: '500' },
});
```

- [ ] **Step 4: Wrap app in SubscriptionProvider**

In `app/_layout.tsx`, wrap `RootNavigator` inside `SubscriptionProvider`:
```typescript
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

// In RootLayout return:
<GestureHandlerRootView style={{ flex: 1 }}>
  <AuthProvider>
    <SubscriptionProvider>
      <RootNavigator />
    </SubscriptionProvider>
  </AuthProvider>
</GestureHandlerRootView>
```

- [ ] **Step 5: Commit**

```bash
git add contexts/SubscriptionContext.tsx hooks/useSubscription.ts components/premium/ app/settings.tsx
git commit -m "feat: add RevenueCat subscription, PremiumGate, and settings screen"
```

---

### Task 19: Share Cards

**Files:**
- Create: `components/sharing/ShareCardView.tsx`
- Modify: `app/dream/[id].tsx` to add share button

- [ ] **Step 1: Create ShareCardView**

Create `components/sharing/ShareCardView.tsx`:

```typescript
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { colors, fonts } from '@/constants/theme';
import type { Dream } from '@/types/database';

interface ShareCardViewProps {
  dream: Dream;
  format: '9:16' | '1:1' | '16:9';
}

const SIZES = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

export const ShareCardView = forwardRef<View, ShareCardViewProps>(({ dream, format }, ref) => {
  const size = SIZES[format];
  const scale = 0.3; // Render at 30% for preview

  return (
    <View ref={ref} style={[styles.card, { width: size.width * scale, height: size.height * scale }]} collapsable={false}>
      {/* Background image */}
      {dream.image_url && (
        <Image source={{ uri: dream.image_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      )}

      {/* Gradient overlay */}
      <View style={styles.overlay} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { fontSize: 18 * scale * 3 }]}>{dream.title}</Text>
        {dream.interpretation && (
          <Text style={[styles.excerpt, { fontSize: 10 * scale * 3 }]} numberOfLines={2}>
            {dream.interpretation.split('.').slice(0, 2).join('.') + '.'}
          </Text>
        )}
        <View style={styles.branding}>
          <Text style={[styles.logo, { fontSize: 12 * scale * 3 }]}>ANIMUS</Text>
          <Text style={[styles.tagline, { fontSize: 8 * scale * 3 }]}>Reveal what lies beneath.</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: 12, backgroundColor: colors.bgDeep },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 8, 18, 0.4)' },
  content: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  title: { fontFamily: fonts.serif, color: '#fff', marginBottom: 8 },
  excerpt: { color: 'rgba(255,255,255,0.8)', lineHeight: 16, marginBottom: 16, fontStyle: 'italic' },
  branding: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 8 },
  logo: { color: colors.purple, fontWeight: '700', letterSpacing: 4 },
  tagline: { color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginTop: 2 },
});
```

- [ ] **Step 2: Add share functionality to dream detail**

Add to `app/dream/[id].tsx`:

```typescript
import { useRef } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ShareCardView } from '@/components/sharing/ShareCardView';
```

Inside the component, add:
```typescript
const shareRef = useRef<View>(null);
const [showShareCard, setShowShareCard] = useState(false);

const handleShare = async () => {
  setShowShareCard(true);
  // Wait for render
  setTimeout(async () => {
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (err) {
      console.warn('Share failed:', err);
    }
    setShowShareCard(false);
  }, 100);
};
```

Add a share button in the UI and the hidden share card view:
```typescript
{/* Share button (add after the title) */}
<Pressable onPress={handleShare} style={styles.shareBtn}>
  <Text style={styles.shareText}>Share</Text>
</Pressable>

{/* Hidden share card for capture */}
{showShareCard && (
  <View style={{ position: 'absolute', left: -9999 }}>
    <ShareCardView ref={shareRef} dream={dream} format="1:1" />
  </View>
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/sharing/ app/dream/
git commit -m "feat: add social share cards with react-native-view-shot"
```

---

### Task 20: Premium AI Features (Patterns, Archetypes, Connections)

**Files:**
- Create: `supabase/functions/dream-insights/index.ts`
- Create: `supabase/functions/archetype-snapshot/index.ts`
- Create: `supabase/functions/dream-connection/index.ts`
- Create: `supabase/functions/suggest-world-entry/index.ts`
- Create: `components/premium/ArchetypeCard.tsx`
- Create: `components/premium/PatternReport.tsx`

- [ ] **Step 1: Write dream-insights edge function**

Create `supabase/functions/dream-insights/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});

  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader! } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  // Verify premium
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  if (profile?.subscription_tier !== 'premium') return new Response(JSON.stringify({ error: 'Premium required' }), { status: 403 });

  const { period_type } = await req.json(); // 'weekly' or 'monthly'
  const daysBack = period_type === 'weekly' ? 7 : 30;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  // Fetch dreams + symbols for the period
  const { data: dreams } = await supabase.from('dreams')
    .select('title, journal_text, interpretation, mood, created_at')
    .eq('user_id', user.id).gte('created_at', since).order('created_at');

  const { data: symbols } = await supabase.from('dream_symbols')
    .select('symbol, archetype, sentiment')
    .eq('user_id', user.id).gte('created_at', since);

  const { data: exercises } = await supabase.from('shadow_exercises')
    .select('prompt, response')
    .eq('user_id', user.id).gte('created_at', since).not('response', 'is', null);

  if (!dreams?.length) return new Response(JSON.stringify({ error: 'No dreams in this period' }), { status: 400 });

  const dreamSummaries = dreams.map((d: any) => `"${d.title}" (${d.mood}) — ${d.interpretation?.slice(0, 100)}...`).join('\n');
  const symbolList = symbols?.map((s: any) => `${s.symbol} (${s.archetype})`).join(', ');
  const exerciseSummary = exercises?.map((e: any) => `Q: ${e.prompt?.slice(0, 50)}... A: ${e.response?.slice(0, 50)}...`).join('\n');

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 1500,
      system: `You are a Jungian analyst delivering a ${period_type} dream analysis session. Write a therapist-level report covering: dominant themes, emerging patterns, archetype activity, shadow work progress, and suggested focus areas. Be warm, insightful, and personal. Write 400-600 words.`,
      messages: [{ role: 'user', content: `Dreams this ${period_type === 'weekly' ? 'week' : 'month'}:\n${dreamSummaries}\n\nSymbols: ${symbolList}\n\nShadow work:\n${exerciseSummary || 'None this period'}` }],
    }),
  });

  const aiResult = await aiResponse.json();
  const report = aiResult.content[0].text;
  const periodStart = since.split('T')[0];
  const periodEnd = new Date().toISOString().split('T')[0];

  const { data: saved } = await supabase.from('pattern_reports')
    .insert({ user_id: user.id, period_type, period_start: periodStart, period_end: periodEnd, report })
    .select().single();

  return new Response(JSON.stringify(saved), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
});
```

- [ ] **Step 2: Write archetype-snapshot edge function**

Create `supabase/functions/archetype-snapshot/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});

  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader! } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  // Count archetype occurrences in last 30 days
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: symbols } = await supabase.from('dream_symbols')
    .select('archetype').eq('user_id', user.id).gte('created_at', since);

  const counts: Record<string, number> = {};
  let total = 0;
  for (const s of symbols || []) {
    if (s.archetype) { counts[s.archetype] = (counts[s.archetype] || 0) + 1; total++; }
  }

  // Normalize to 0-1 scale
  const archetypes: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    archetypes[k] = Math.round((v / Math.max(total, 1)) * 100) / 100;
  }

  const sorted = Object.entries(archetypes).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0]?.[0] || null;

  // Compare with previous snapshot to find rising
  const { data: prevSnapshot } = await supabase.from('archetype_snapshots')
    .select('archetypes').eq('user_id', user.id).order('snapshot_date', { ascending: false }).limit(1).maybeSingle();

  const rising: string[] = [];
  if (prevSnapshot?.archetypes) {
    for (const [k, v] of Object.entries(archetypes)) {
      const prev = (prevSnapshot.archetypes as Record<string, number>)[k] || 0;
      if (v > prev + 0.1) rising.push(k);
    }
  }

  const { data: snapshot } = await supabase.from('archetype_snapshots')
    .insert({ user_id: user.id, snapshot_date: new Date().toISOString().split('T')[0], archetypes, dominant, rising })
    .select().single();

  return new Response(JSON.stringify(snapshot), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
});
```

- [ ] **Step 3: Write dream-connection edge function**

Create `supabase/functions/dream-connection/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});

  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader! } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { dream_a_id, dream_b_id } = await req.json();

  const [dreamARes, dreamBRes] = await Promise.all([
    supabase.from('dreams').select('title, journal_text, interpretation').eq('id', dream_a_id).single(),
    supabase.from('dreams').select('title, journal_text, interpretation').eq('id', dream_b_id).single(),
  ]);

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 300,
      system: 'You are a Jungian analyst. Analyze how two dreams connect — shared symbols, narrative threads, archetypal patterns. Write 2-4 sentences. Be poetic and insightful.',
      messages: [{ role: 'user', content: `Dream A: "${dreamARes.data?.title}" — ${dreamARes.data?.journal_text}\n\nDream B: "${dreamBRes.data?.title}" — ${dreamBRes.data?.journal_text}` }],
    }),
  });

  const aiResult = await aiResponse.json();
  const analysis = aiResult.content[0].text;

  const { data: connection } = await supabase.from('dream_connections')
    .insert({ user_id: user.id, dream_a_id, dream_b_id, analysis })
    .select().single();

  return new Response(JSON.stringify(connection), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
});
```

- [ ] **Step 4: Write suggest-world-entry edge function**

Create `supabase/functions/suggest-world-entry/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});

  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader! } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  // Get recurring symbols not yet in world_entries
  const { data: symbols } = await supabase.from('dream_symbols')
    .select('symbol').eq('user_id', user.id);
  const { data: existing } = await supabase.from('world_entries')
    .select('name').eq('user_id', user.id);

  const existingNames = new Set((existing || []).map(e => e.name.toLowerCase()));
  const symbolCounts: Record<string, number> = {};
  for (const s of symbols || []) {
    symbolCounts[s.symbol] = (symbolCounts[s.symbol] || 0) + 1;
  }

  // Find symbols appearing 3+ times not in world entries
  const suggestions = Object.entries(symbolCounts)
    .filter(([sym, count]) => count >= 3 && !existingNames.has(sym.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([symbol, count]) => ({ symbol, count }));

  return new Response(JSON.stringify({ suggestions }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
});
```

- [ ] **Step 5: Deploy all edge functions**

```bash
npx supabase functions deploy dream-insights
npx supabase functions deploy archetype-snapshot
npx supabase functions deploy dream-connection
npx supabase functions deploy suggest-world-entry
```

- [ ] **Step 6: Create ArchetypeCard component**

Create `components/premium/ArchetypeCard.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { ARCHETYPE_MAP } from '@/constants/archetypes';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { ArchetypeSnapshot } from '@/types/database';

export function ArchetypeCard({ snapshot }: { snapshot: ArchetypeSnapshot }) {
  const sorted = Object.entries(snapshot.archetypes).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Archetype Profile</Text>
      {snapshot.dominant && (
        <Text style={styles.dominant}>
          {ARCHETYPE_MAP[snapshot.dominant]?.symbol} {ARCHETYPE_MAP[snapshot.dominant]?.name || snapshot.dominant} is dominant
        </Text>
      )}
      {snapshot.rising?.length > 0 && (
        <Text style={styles.rising}>Rising: {snapshot.rising.map(r => ARCHETYPE_MAP[r]?.name || r).join(', ')}</Text>
      )}
      <View style={styles.bars}>
        {sorted.slice(0, 5).map(([key, value]) => (
          <View key={key} style={styles.barRow}>
            <Text style={styles.barLabel}>{ARCHETYPE_MAP[key]?.symbol} {ARCHETYPE_MAP[key]?.name || key}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(value as number) * 100}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.purple },
  title: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, marginBottom: spacing.sm },
  dominant: { fontFamily: fonts.serif, fontSize: 15, color: colors.purple, marginBottom: 4 },
  rising: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', marginBottom: spacing.md },
  bars: { gap: spacing.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 120, fontSize: 12, color: colors.textSecondary },
  barTrack: { flex: 1, height: 6, backgroundColor: colors.bgDark, borderRadius: 3 },
  barFill: { height: 6, backgroundColor: colors.purple, borderRadius: 3 },
});
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/ components/premium/
git commit -m "feat: add premium AI features — dream insights, archetype snapshots, connections, world suggestions"
```

---

### Task 21: Polish & Final Integration

**Files:**
- Create: `components/ui/OuroborosSpinner.tsx`
- Various integration tweaks across existing files

- [ ] **Step 1: Create Ouroboros loading spinner**

Create `components/ui/OuroborosSpinner.tsx`:

```typescript
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/theme';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export function OuroborosSpinner({ size = 48 }: { size?: number }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1, false
    );
  }, [rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path
          d="M50 10 A40 40 0 1 1 49.99 10 L55 15 A35 35 0 1 0 55 14.99 Z"
          fill={colors.purple}
          opacity={0.8}
        />
        {/* Snake head eating tail */}
        <Path d="M47 8 L53 12 L47 16 Z" fill={colors.purple} />
      </Svg>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Add gentle My World re-prompt logic**

In `lib/ai.ts`, after `processDream` saves successfully, add a check:

```typescript
// After saving dream, check if user needs a My World nudge
async function checkWorldNudge(userId: string): Promise<boolean> {
  const { count: dreamCount } = await supabase.from('dreams').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  const { count: worldCount } = await supabase.from('world_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId);

  // Nudge after 3-5 dreams if no world entries
  return (dreamCount ?? 0) >= 3 && (worldCount ?? 0) === 0;
}
```

Return this from `processDream` so the UI can show a nudge.

- [ ] **Step 3: Call archetype-snapshot after each dream (premium)**

In `lib/ai.ts`, at the end of `processDream`, add:

```typescript
// Update archetype profile for premium users
const { data: userProfile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
if (userProfile?.subscription_tier === 'premium') {
  callEdgeFunction('archetype-snapshot', {}).catch(err => console.warn('Archetype update failed:', err));
}
```

- [ ] **Step 4: Final commit**

```bash
git add components/ui/OuroborosSpinner.tsx lib/ai.ts
git commit -m "feat: add Ouroboros spinner, My World nudge, and premium archetype auto-update"
```

---

## Summary of Edge Functions to Deploy

| Function | Purpose | Deployed In |
|----------|---------|-------------|
| `interpret-dream` | Dream → AI interpretation + symbols + image prompt | Task 8 |
| `generate-image` | Image prompt → Gemini artwork → Supabase Storage | Task 9 |
| `go-deeper` | Socratic dream conversation | Task 12 |
| `shadow-exercise` | AI-generated shadow work prompts | Task 14 |
| `dream-insights` | Weekly/monthly analyst reports (premium) | Task 20 |
| `archetype-snapshot` | Archetype activity recalculation (premium) | Task 20 |
| `dream-connection` | Two-dream comparative analysis | Task 20 |
| `suggest-world-entry` | Suggest My World additions from patterns | Task 20 |

## Remaining Polish (Post-Plan)

These items are specified in the design spec but deferred to post-V1 polish sprints:

- [ ] Ink-writing-itself animation on new dream entry
- [ ] Image fades-in-like-painting animation
- [ ] Page-turn animation between journal entries
- [ ] Floating particles (dust in moonlight) on ambient screens
- [ ] Stars scatter animation when opening Dream Web
- [ ] Dissolve transitions between major screens
- [ ] Morning dream reminder notification (expo-notifications)
- [ ] Data export in settings
- [ ] Custom dream art styles (premium)
- [ ] Native ad cards in journal gallery scroll
