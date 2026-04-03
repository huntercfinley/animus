# Animus — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Tagline:** Reveal what lies beneath.
**Mission:** Animus gives people a bridge to their unconscious mind — it is a place to capture and understand their dreams, then receive healing in the process.

---

## 1. Product Overview

Animus is a mobile dream journal app rooted in Carl Jung's depth psychology. It captures dreams via voice recording the moment users wake, transforms them into beautiful journal entries with AI-generated artwork, provides personalized Jungian interpretation, tracks patterns across the user's dream life, and offers shadow work exercises tied to dream themes.

**What makes Animus different:**
1. Dreams as the gateway to shadow work — no other app connects these
2. The AI actually knows you — personal context makes every interpretation unique
3. Beautiful by default — every dream becomes a journal page with original artwork
4. The Dream Web — constellation map of your unconscious, unlike anything else
5. Ethical monetization — all features accessible, transparent about costs
6. Built for the morning ritual — voice recording optimized for the moment between sleeping and waking
7. Fishing/depths visual metaphor — the app feels like reaching into an ocean and pulling up what the unconscious offers

---

## 2. Platform & Stack

- **Platform:** iOS + Android via Expo / React Native
- **Backend:** Supabase (auth, PostgreSQL database, storage, edge functions)
- **Architecture:** Monolith Expo app — Supabase as the entire backend
- **AI (all tiers):** Claude Sonnet 4.6 via Anthropic API (interpretation) + Gemini 3.1 Flash Image Preview via Google API (image generation)
- **Voice recording:** expo-av (audio capture, AAC/M4A encoding)
- **Ads:** react-native-google-mobile-ads — interstitial and native formats
- **Offline:** Local recording via expo-av + SQLite queue, sync when online. Premium users get offline access to cached journal entries, interpretations, and images.

---

## 3. App Structure & Navigation

### Bottom Tab Bar (5 tabs)

1. **Record** (center, prominent) — Tap to start voice recording or type a dream. Default landing screen.
2. **Journal** — Gallery of dream entries as physical journal cards with images, organized by month.
3. **Dream Map** — Heatmap calendar + Dream Web constellation, toggled with a swipe or tab.
4. **Shadow Work** — Exercises surfaced from dreams + standalone Jungian prompts.
5. **My World** — Personal profile: life context, recurring characters, themes for AI personalization.

### Overlay Flows (modals)

- **Dream Detail** — Full journal page: text, image, interpretation, "go deeper" conversation, related dreams, symbol tags
- **Onboarding** — Optional "Map your inner world" guided flow
- **Settings** — Account, subscription, notifications, data export

---

## 4. Visual Design Language

### Aesthetic

- **Palette:** Dark backgrounds (#0a0812 to #12101a), deep purples (#9370DB), indigos, ocean blues (#4682B4), soft warm glows. Never bright white.
- **Typography:** Georgia or similar serif for journal text and dream titles. System sans-serif for UI elements. The journal should feel handwritten/literary, not digital.
- **Textures:** Subtle gradients mimicking depth — dark oceans, night skies. Spine shadows on journal pages. Soft vignettes on images.
- **Shape language:** Rounded corners, organic forms. Nothing sharp or corporate.

### Jungian Visual Elements

- Ouroboros (snake eating its tail) as loading spinner
- Mandala patterns as section dividers
- Archetypal symbols as subtle UI decorations
- Mirror/reflection motifs in shadow work screens

### Fishing / Depths Metaphor

The core visual metaphor is fishing in the depths of the unconscious ocean:
- **Recording:** Saving a dream shows something luminous rising from dark water
- **"Go deeper":** Descent animation — sinking beneath the surface
- **Dream Web:** Background has ocean-depth quality — vast dark space with glowing elements
- **Loading states:** Glowing forms rising slowly from darkness
- **Empty states:** "Cast your line. What did you dream last night?"
- **Shadow work:** Framed as diving deeper beneath the surface

### Animations & Transitions

- Floating particles (dust in moonlight) on ambient screens
- Page-turn animations when navigating journal entries
- Ink-writing-itself animation when a new dream entry appears
- Image fades in like being painted (after async generation)
- Stars scatter into position when opening Dream Web
- Dissolve transitions between major screens (waking up in reverse)
- Dream image art styles rotate: surrealist, dark fantasy, watercolor, magical realism, etc.

---

## 5. Core Features

### 5.1 Dream Recording

**Flow:**
1. Tap Record tab — minimal screen: dark background, large pulsing mic button, zero clutter
2. Tap to start recording — voice-to-text streams live on screen
3. Tap to stop, or pause/resume (dreams come in fragments)
4. Optional: type to add/edit details
5. Tap "Save" — dream captured
6. Behind the scenes: AI polishes transcript → generates title → starts interpretation → kicks off image generation
7. Transition to new journal page — text appears like ink writing itself, image fades in when ready (10-30s)

**Key decisions:**
- Record screen has zero cognitive load — a half-asleep person with one eye open can use it
- Voice recording via expo-av with continuous recognition (speech-to-text via AI in edge function)
- AI prose polish is subtle — cleans "um"s, fragments, repetition but preserves user's voice and word choices. It's their journal, not the AI's.
- Image generation is async — journal entry appears immediately, image fades in when ready

### 5.2 Dream Journal

- Every dream is a page in a physical journal — serif typography, spine shadows, embedded illustration
- Gallery view: dream cards with images, organized by month, scrollable
- Each card has a color-coded left spine based on dominant theme
- Tap any card to open full dream detail page
- Older months collapse into labeled rows ("February 2026 — 8 dreams")
- Dreams feel like precious artifacts, not text files

### 5.3 AI Interpretation

**AI Personality:** A warm dream analyst — wise companion, not a chatbot. Uses Jungian concepts naturally. Speaks with metaphor. Asks "Could this represent..." not "This represents..."

**System Prompt Architecture (4 layers):**
1. **Base:** Jungian depth psychology — archetypes, shadow, anima/animus, collective unconscious, individuation, active imagination. Interpret symbolically, not literally.
2. **Personal:** Injected from user's "My World" profile — important people, life events, recurring places, themes.
3. **Dream history:** Compressed symbol summary from recent dreams (last 10-20). Format: `{symbol, count, last_seen, sentiment}`. Small token footprint, full context.
4. **Tone:** Warm, poetic, never clinical. Metaphorical. Questions over declarations.

**Interpretation Flow:**
1. Dream text → Extract symbols and archetypes (same API call as interpretation — one round-trip)
2. Cross-reference compressed dream history for patterns
3. Generate personalized interpretation using full context
4. Flag shadow elements naturally within interpretation
5. If shadow themes are strong, queue a related shadow exercise suggestion

**"Go deeper" conversation:**
- Socratic questions, not leading ones
- Draws connections to previous dreams and life context
- Only sends current dream + conversation so far per exchange (not entire history — initial interpretation already incorporated historical context)
- Free: 5 exchanges max per dream (ad before each)
- Premium: 10 exchanges max per dream

**Token Optimization:**
- System prompt cached (90% cost reduction on input tokens)
- Dream history compressed to symbol summaries, not full text
- Image prompt generated from interpretation text, not by re-analyzing the dream
- Symbol extraction bundled into interpretation call
- Free: ~150-200 word interpretations
- Premium: ~300-400 word interpretations

**Cost model:** Same high-quality AI models for all users. Ad revenue offsets free-tier AI costs (~$0.01-0.03 per interpretation, ~$0.01 per image). Interstitial ads average $0.01-0.05 eCPM per impression — multiple ad touchpoints per dream session keep the math viable.

### 5.4 Image Generation

- Auto-generates one image per dream immediately after recording
- Art style is adaptive to dream mood (peaceful → soft watercolor, nightmare → dark surrealism, mundane → magical realism)
- Intentionally rotates through styles (surrealist, dark fantasy, watercolor, magical realism, ink wash, Art Nouveau, etc.) so users discover new aesthetics
- Image prompt derived from the interpretation — one generation, two outputs
- Refinement/regeneration: requires ad (free) or counts against premium limit
- All tiers: Gemini 3.1 Flash Image Preview (best quality, fast, cost-effective)

### 5.5 Dream Map (Dual View)

Two views, easily toggled via swipe or tab:

**Heatmap Calendar:**
- GitHub-style grid, one square per day
- Color intensity = dream activity (number of dreams or emotional intensity)
- Shows current streak and longest streak
- Tap any day to jump to that dream
- Monthly summary stats

**Dream Web (Constellation):** *(hardest technical challenge — requires react-native-skia + force-directed graph layout)*
- Dreams are stars in a deep, ocean-dark sky
- Clusters form around recurring themes (Shadow, Water, Childhood, Pursuit, etc.)
- Lines connect related dreams within clusters
- Faint dashed lines connect cross-cluster relationships
- Theme labels float near clusters
- Tap any star to open that dream
- Pinch to zoom, pan to explore
- New dreams animate into position (stars scattering)

### 5.6 Shadow Work

**Integrated (through dreams):**
- AI naturally surfaces shadow elements in interpretations
- "This dark figure may represent your suppressed anger about X"
- Suggests shadow exercises tied to specific dream themes

**Standalone exercises:**
- Curated Jungian prompts (e.g., "Describe someone who irritates you — what quality do they reflect in you?")
- Mirror/reflection visual motif throughout
- Framed as "diving deeper" — uses the depths/fishing metaphor
- User responses stored and referenced by AI in future interpretations

**Access:** Always requires an ad on free. Unlimited on premium (5/day cap).

### 5.7 My World (Personal Context)

**Onboarding (optional):**
- Magical guided flow: "Let's map your inner world"
- 3-5 screens: important people, life situation, recurring dream themes, places that matter
- Users can skip any/all — gentle nudge that it's confidential and improves analysis
- Never forced

**Living profile:**
- Add/edit entries anytime: people, places, themes, life events
- Each entry has: name, description, relationship/category
- AI suggests additions from dream patterns ("You've mentioned a childhood house 3 times — want to add it to your world?")
- `ai_suggested` flag distinguishes user-created vs AI-suggested entries
- **Gentle re-prompt:** After 3-5 dreams with no My World entries, show a soft nudge: "Your interpretations get more personal when I know your world. Want to add a few details?" — dismissible, never aggressive

### 5.8 Dream Connections

- On the Dream Web, tap any two stars to see how those dreams relate
- AI analyzes both dreams' symbols, archetypes, and narrative threads
- Presents a short synthesis: "Both dreams feature enclosed spaces filling with water. In March 5th's dream you were trapped; by March 19th you were swimming. Your unconscious may be showing you that what once felt overwhelming is becoming navigable."
- Free: ad per connection
- Premium: included

### 5.9 Dream Patterns AI (Premium)

- Weekly or monthly AI-generated "analyst session"
- Reads across ALL dreams in the period — not just individual interpretations but the meta-narrative
- Therapist-level report: dominant themes, emerging patterns, archetype activity, shadow work progress, suggested focus areas
- Delivered as a beautiful journal-style page with its own generated image
- The premium crown jewel — the closest thing to having a real Jungian analyst

### 5.10 Archetype Profile (Premium)

- Evolving portrait of which Jungian archetypes are most active in the user's psyche
- Updates after each dream based on accumulated symbol data
- Visual dashboard/card showing: dominant archetype, rising archetypes, dormant archetypes
- Archetypes tracked: Shadow, Anima/Animus, Wise Old Man/Woman, Trickster, Hero, Self, Great Mother, Child, Persona
- "Your Shadow is very active this month. Your Anima is emerging."

### 5.11 Dream Audio Playback (Premium)

- Original voice recordings preserved in Supabase Storage
- Play back from the dream detail page — a small audio player embedded in the journal page
- Storage: ~1-2MB per recording (AAC/M4A compressed)
- Cost: negligible (~$1/month per 1,000 active users)
- Free users: transcript only, audio discarded after processing

### 5.12 Custom Dream Art Styles (Premium)

- Set a preferred art style: "always dark watercolor", "always surrealist", etc.
- Or let the adaptive system continue rotating (default)
- Minor personalization feature, not a selling point

### 5.13 Social Sharing

**Dream share card (client-side via react-native-view-shot):**
- AI-generated dream image as hero
- Dream title in serif typography
- 1-2 line interpretation excerpt
- Animus logo + "Reveal what lies beneath" tagline
- Always branded (free and premium)
- Optimized formats: Instagram Stories (9:16), X/Twitter (16:9), square (1:1)
- Cards rendered on-device — no server-side image generation needed
- Cards should be visually stunning — the primary organic marketing engine

---

## 6. Monetization

### Philosophy

All features accessible to free users through ads. Premium removes the friction. Transparent about why ads exist — AI costs real money.

### Transparent Ad Messaging

Before each ad, display a brief rotating message:
- "This ad keeps Animus free. AI dreams aren't cheap — thank you for supporting us."
- "Dream interpretation, image generation, and your data all cost real money to run. This ad helps us keep Animus open to everyone."
- "You're about to go deeper. This ad helps us keep the lights on so everyone can explore their dreams."

### Ad Placement (respect the sacred moments)

**Where ads appear:**
- Before "go deeper" exchanges
- Before shadow work exercises
- Before image refinement
- Before dream connections
- Between journal entries when scrolling gallery (native-feeling cards)
- After saving a dream (interstitial while image generates — natural wait)
- Before monthly Dream Insights report

**Where ads NEVER appear:**
- During voice recording
- While reading a dream journal page
- During "go deeper" conversation (between exchanges is fine, not mid-conversation)
- During shadow work exercises (before is fine, not during)
- On the Dream Map / Dream Web

### Usage Limits

| Feature | Free (ad-gated) | Premium |
|---------|-----------------|---------|
| Dream recordings | Unlimited, always free | Same |
| Initial interpretation | Unlimited, always free (Claude Sonnet 4.6) | Same |
| "Go deeper" exchanges | 5 per dream, ad each | 10 per dream |
| Image generation (auto) | 1 per dream, always free (Gemini 3.1) | Same |
| Image refinement | 1 per dream, ad each | 3 per dream |
| Shadow work exercises | 3 per day, ad each | 5 per day |
| Dream Connections | Ad per connection | Included |
| Dream Map / Dream Web | Always free | Same |
| Social share cards | Always free (Animus branded) | Same (Animus branded) |
| Monthly Dream Insights | 1/month, ad to unlock | 1/month, automatic |
| Dream Patterns AI | Not available | Weekly/monthly analyst reports |
| Archetype Profile | Not available | Evolving Jungian portrait |
| Dream Audio Playback | Not available | Replay original voice recordings |
| Custom Art Styles | Not available | Set preferred aesthetic direction |
| Offline access | Recording only (syncs when online) | Cached entries, interpretations, images |

### Premium-Exclusive Features

**Dream Patterns AI** — The premium crown jewel. A weekly or monthly AI-generated "analyst session" that reads across ALL dreams and delivers a therapist-level insight report. "This month, your unconscious has been fixated on containment — locked rooms, boxes, jars. Here's what that likely means given what you're going through with X." The closest thing to having a real Jungian analyst.

**Archetype Profile** — An evolving portrait of which Jungian archetypes are most active in the user's psyche. Updates as they dream. "Your Shadow is very active this month. Your Anima is emerging." Feels deeply personal and magical. Displayed as a visual card/dashboard.

**Dream Audio Playback** — Preserve and replay original voice recordings. Storage cost is negligible (~1-2MB per recording, ~$1/month per 1,000 active users). The emotional value of hearing your own groggy 4am voice far exceeds the cost.

**Custom Dream Art Styles** — Set a preferred art style or upload reference images. "Always render my dreams in dark watercolor." Minor feature — a nice personalization touch, not a premium selling point.

### Pricing

- **Premium monthly:** ~$9.99/month
- **Premium annual:** ~$79.99/year (save ~33%)

---

## 7. Data Model (Supabase PostgreSQL)

### Tables

**`profiles`**
- `id` (uuid, PK, references auth.users)
- `email` (text)
- `display_name` (text)
- `avatar_url` (text, nullable)
- `subscription_tier` (enum: free, premium)
- `onboarding_completed` (boolean, default false)
- `ai_context` (jsonb — structured personal info from My World)
- `dream_count` (integer, default 0)
- `streak_current` (integer, default 0)
- `streak_longest` (integer, default 0)
- `created_at`, `updated_at` (timestamptz)

**`dreams`**
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `recorded_at` (timestamptz — when the dream was recalled)
- `title` (text — AI-generated, user-editable)
- `raw_transcript` (text — voice-to-text output)
- `journal_text` (text — AI-polished prose)
- `interpretation` (text — Jungian analysis)
- `image_url` (text — Supabase Storage path)
- `image_style` (text — art style used)
- `image_prompt` (text — the prompt sent to image AI)
- `mood` (text — AI-detected: peaceful, anxious, surreal, dark, etc.)
- `lucidity_level` (integer, 0-10, nullable)
- `is_favorite` (boolean, default false)
- `audio_url` (text, nullable — Supabase Storage path, premium only)
- `model_used` (text — e.g., claude-sonnet-4.6)
- `created_at` (timestamptz)

**`dream_symbols`**
- `id` (uuid, PK)
- `dream_id` (uuid, FK → dreams)
- `user_id` (uuid, FK → profiles)
- `symbol` (text — e.g., "water", "locked door")
- `archetype` (text — Shadow, Anima, Animus, Wise Old Man, Trickster, Self, etc.)
- `sentiment` (text — positive, negative, neutral)
- `created_at` (timestamptz)

**`dream_conversations`**
- `id` (uuid, PK)
- `dream_id` (uuid, FK → dreams)
- `role` (text — user or assistant)
- `content` (text)
- `exchange_number` (integer — 1, 2, 3...)
- `created_at` (timestamptz)

**`shadow_exercises`**
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `dream_id` (uuid, FK → dreams, nullable — can be standalone)
- `prompt` (text — the exercise prompt)
- `response` (text — user's written response)
- `created_at` (timestamptz)

**`world_entries`**
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `category` (enum: person, place, theme, life_event)
- `name` (text)
- `description` (text)
- `relationship` (text, nullable — e.g., "mother", "childhood home")
- `ai_suggested` (boolean, default false)
- `created_at`, `updated_at` (timestamptz)

**`dream_connections`**
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `dream_a_id` (uuid, FK → dreams)
- `dream_b_id` (uuid, FK → dreams)
- `analysis` (text — AI-generated connection explanation)
- `created_at` (timestamptz)

**`archetype_snapshots`**
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `snapshot_date` (date)
- `archetypes` (jsonb — e.g., `{shadow: 0.8, anima: 0.6, trickster: 0.3, ...}`)
- `dominant` (text — most active archetype)
- `rising` (text[] — archetypes gaining activity)
- `created_at` (timestamptz)

**`pattern_reports`**
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `period_type` (enum: weekly, monthly)
- `period_start` (date)
- `period_end` (date)
- `report` (text — AI-generated analyst session)
- `image_url` (text — generated image for the report)
- `created_at` (timestamptz)

**`usage_limits`**
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `dream_id` (uuid, FK → dreams, nullable — null for daily counters)
- `limit_type` (enum: go_deeper, image_refinement, shadow_exercise, dream_connection, dream_insights)
- `count` (integer, default 0)
- `period_date` (date — for daily limits like shadow exercises)
- `created_at`, `updated_at` (timestamptz)
- Unique constraint: `(user_id, dream_id, limit_type)` for per-dream limits, `(user_id, limit_type, period_date)` for daily limits

### Row Level Security (RLS) Policies

All tables enforce RLS — users can only access their own data:
- **SELECT/INSERT/UPDATE/DELETE** on all tables: `auth.uid() = user_id`
- **profiles**: additionally, INSERT only via `auth.uid() = id` (matches auth.users)
- **dream_connections**: check both `dream_a_id` and `dream_b_id` belong to the requesting user
- **Storage buckets**: RLS via storage policies — files keyed by `{user_id}/{filename}`, users can only read/write their own prefix
- Edge functions validate `Authorization: Bearer <jwt>` and extract user_id from the token

### Storage Buckets

- `dream-images` — AI-generated dream artwork
- `dream-audio` — Original voice recordings (premium only, AAC/M4A)
- `report-images` — Images for Dream Patterns AI reports
- `avatars` — User profile images

### Key Indexes

- `dreams(user_id, created_at DESC)` — journal gallery query
- `dream_symbols(user_id, symbol)` — pattern tracking
- `dream_symbols(user_id, archetype)` — constellation clustering
- `world_entries(user_id, category)` — My World queries
- `dream_connections(user_id)` — connection history
- `archetype_snapshots(user_id, snapshot_date DESC)` — latest archetype state
- `pattern_reports(user_id, period_end DESC)` — latest reports
- `usage_limits(user_id, dream_id, limit_type)` — per-dream limit lookups
- `usage_limits(user_id, limit_type, period_date)` — daily limit lookups

---

## 8. Supabase Edge Functions

All AI calls proxied through Supabase Edge Functions (Deno) to protect API keys:

1. **`interpret-dream`** — Receives audio file or text + user context. Transcribes audio (if applicable), polishes prose, generates title, interpretation, extracted symbols, image prompt. One API call to Claude Sonnet 4.6. Also enforces usage limits and checks subscription tier.
2. **`generate-image`** — Receives image prompt + style. Calls Gemini 3.1 Flash Image Preview. Uploads result to Supabase Storage. Returns URL.
3. **`go-deeper`** — Receives dream + conversation history. Returns next AI response. One API call to Claude Sonnet 4.6. Enforces per-dream exchange limits via `usage_limits` table.
4. **`shadow-exercise`** — Generates a shadow work prompt, optionally tied to a dream's symbols. Enforces daily limits.
5. **`dream-insights`** — Generates weekly/monthly Dream Patterns AI report from compressed dream history. Premium only.
6. **`suggest-world-entry`** — Analyzes recent dreams and suggests My World additions. Triggered after every 3-5 dreams if user has no My World entries.
7. **`dream-connection`** — Receives two dream IDs, analyzes shared symbols/archetypes/narrative threads, returns synthesis.
8. **`archetype-snapshot`** — Recalculates archetype activity levels from recent dream symbols. Runs after each dream. Premium only.

**Note:** Share cards are rendered client-side via `react-native-view-shot` — no edge function needed.

---

## 9. Key User Flows

### First Launch
1. Splash screen with Animus logo, soft particle animation
2. 3 onboarding screens explaining the app (swipeable, skippable)
3. Sign up (email/password or social auth via Supabase)
4. "Map your inner world" prompt — skip or complete 3-5 screens
5. Land on Record screen — "Cast your line. What did you dream last night?"

### Morning Dream Capture
1. Wake up → open Animus (or tap notification reminder)
2. Record screen — tap mic, speak dream
3. Tap save → luminous-rising-from-depths animation
4. Journal page appears — ink-writing animation, image fades in
5. Read interpretation, optionally tap "Go deeper" (ad on free)
6. Close app — dream is preserved forever

### Exploring Patterns
1. Open Dream Map tab
2. Default: heatmap calendar — see streaks, tap any day
3. Swipe/tab to Dream Web — see constellation of themes
4. Tap a cluster to zoom in, tap a star to open that dream
5. Notice patterns: "Water has appeared 7 times this month"

### Shadow Work Session
1. Open Shadow Work tab — see exercises tied to recent dreams
2. Tap an exercise (ad on free) — mirror/reflection visual motif
3. Read the prompt, write your response
4. AI stores response, references it in future interpretations

### Viewing Archetype Profile (Premium)
1. Open My World tab → Archetype Profile card at the top
2. See dominant archetype, rising archetypes, dormant archetypes
3. Tap any archetype for a description of what it means and which dreams activated it
4. Profile updates automatically after each new dream

### Exploring Dream Connections
1. Open Dream Web (constellation view)
2. Tap one star, then tap another — "Compare these dreams" prompt appears
3. Watch ad (free) or tap directly (premium)
4. AI synthesis appears as an overlay card connecting the two dreams

### Sharing a Dream
1. Open any dream detail page
2. Tap share icon
3. Select format (Stories, square, landscape)
4. Preview the branded share card (image + title + interpretation excerpt + Animus logo)
5. Share to Instagram, X, TikTok, Messages, etc.

---

## 10. Out of Scope (V1)

- Web version (mobile only for V1)
- Lucid dreaming tools (reality check reminders, dream sign tracking — V2)
- Community/social features (sharing dreams within Animus — V2)
- Apple Watch / sleep tracking integration (V2)
- Multiple languages (English only for V1)
- Therapist integration / export to clinician (V2)
