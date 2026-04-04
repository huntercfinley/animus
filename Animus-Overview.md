# Animus — Overview

> "Reveal what lies beneath."

**Animus gives people a bridge to their unconscious mind — a place to capture and understand their dreams, then receive healing in the process.**

Most people wake up from vivid dreams and forget them within minutes. The ones who do remember often carry fragments — haunting images, recurring characters, unresolved feelings — with no way to make sense of them. Traditional dream dictionaries reduce rich, personal symbols to generic fortune-cookie meanings. Therapy is expensive and inaccessible. Journaling alone doesn't connect the dots.

Animus changes this. Rooted in Carl Jung's depth psychology, Animus treats dreams as messages from the unconscious — not puzzles to be solved, but invitations to listen. Over time, it reveals the common threads running through your dream life: the recurring symbols, the shadow aspects asking to be seen, the archetypes guiding your individuation journey.

**Core beliefs:**
- Dreams are meaningful, not random — they deserve to be preserved beautifully
- Healing happens through awareness — seeing your patterns is the first step
- Shadow work is not scary — it's the path to wholeness
- Technology should feel magical, not clinical — the app itself should feel like a dream
- Everyone deserves access to depth psychology, not just those who can afford an analyst

---

## What Users Want

Based on research across Reddit, app reviews, and community forums (see `Animus-Research.md`):

- **Capture dreams effortlessly** — voice recording the moment they wake up
- **Understand dreams deeply** — personal Jungian analysis, not generic dictionary meanings
- **See patterns over time** — recurring symbols, characters, and themes mapped visually
- **Beautiful visual artifacts** — every dream deserves artwork, not just text in a list
- **Shadow work connection** — dreams as a gateway to the unconscious
- **No bait-and-switch** — transparent pricing, no features yanked behind paywalls
- **An active developer** — regular updates, not abandonware

---

## Stack

- **Platform:** Expo / React Native (iOS + Android)
- **Backend:** Supabase (auth, database, storage, edge functions)
- **AI Interpretation:** Claude Sonnet 4.6 (personalized Jungian analysis)
- **Image Generation:** Imagen 4 Fast (free tier, $0.02/image) / Imagen 4 Standard (premium, $0.04/image)
- **Appearance Analysis:** Gemini 2.0 Flash Vision (premium selfie → physical description for image personalization)
- **Monetization:** RevenueCat (subscriptions) + Google Mobile Ads (ad-gated free tier)
- **Bundle ID:** `com.realitysuites.animus`
- **Apple ID:** 6761337884

---

## Features

### Implemented (MVP Core)

**Dream Recording** — Voice-to-text with continuous speech recognition via `expo-av` + `@react-native-voice`. Text input as alternative. AI polishes transcript into beautiful journal prose. Auto-generates title.

**AI Interpretation** — Jungian analysis delivered immediately after recording. Personalized via "My World" context (life events, people, recurring themes). Surfaces shadow elements naturally. Powered by Claude Sonnet 4.6 edge function.

**"Go Deeper" Conversations** — Multi-turn conversation with the AI about any dream. 5 exchanges free (ad-gated), 10 premium. Bubble-style chat UI.

**Image Generation** — Auto-generates one image per dream. Adaptive art style based on dream mood. Free: Imagen 4 Fast (10/month, ad per image). Premium: Imagen 4 Standard (30/month, no ads). Monthly usage tracking via `usage_limits` table.

**Appearance Upload** *(premium)* — Upload 1-3 selfies, Gemini 2.0 Flash Vision extracts a physical description, stored in `profiles.ai_context.appearance`. Description is injected into all future image generation prompts so the dreamer appears as themselves in dream artwork.

**Dream Journal** — Gallery view with dream cards organized by month. Each card shows image, title, preview text, mood-colored spine. Physical journal aesthetic.

**Dream Map (Dual View)** — Toggle between:
- Heatmap calendar (GitHub-style grid of dream activity)
- Dream Web constellation (force-directed graph with dreams as nodes, clustered by archetype, lines connecting related dreams)

**Shadow Work** — AI-generated Jungian exercises tied to dream symbols. 3 exercises/day free (ad-gated), 5 premium.

**My World** — Living profile of personal context: people, places, life events, recurring themes. AI uses this for personalized interpretation. CRUD interface.

**Ad-Gated Monetization** — Transparent messaging before each ad explaining costs. Respects premium tier (bypasses ads). Rotating messages about why ads exist.

**Offline Queue** — SQLite stores dreams when offline, ready for sync when connection returns.

**Social Sharing** — Dream cards captured as branded images via `react-native-view-shot` for sharing to Instagram, X, TikTok.

### Placeholder / Needs Completion

- **Archetype Profile** (premium) — evolving portrait of active Jungian archetypes
- **Dream Patterns AI** (premium) — weekly/monthly analyst reports across all dreams
- **Premium audio playback** — replay original voice recordings
- **Custom Dream Art Styles** (premium) — set preferred aesthetic
- **Onboarding flow** — guided "Map Your Inner World" intro
- **Settings screen** — account, subscription, notifications, data export
- **Offline sync loop** — queue code exists, periodic sync not integrated in app startup

---

## Monetization

**Free tier:** All features accessible via ads. Claude Sonnet 4.6 + Imagen 4 Fast. Transparent ad messaging.
- 10 images/month, 5 go-deeper/dream, 1 image refinement/dream, 3 shadow exercises/day, 1 dream insight report

**Premium ($4.99/month, $35.99/year via RevenueCat):** Remove all ads + exclusive features:
- Dream Patterns AI (therapist-level insight reports)
- Archetype Profile (evolving Jungian portrait)
- Appearance Upload (personalized dream imagery via Gemini Vision)
- Dream Audio Playback (replay original recordings)
- Custom Dream Art Styles
- Imagen 4 Standard (higher quality images)
- Higher usage limits (30 images/month, 10 go-deeper/dream, 3 image refinements, 5 shadow exercises/day, unlimited insights)

**Ad-gated actions (free):** Go deeper, shadow work, image refinement, dream connections, monthly insights.

**No surprise paywalls ever.** Features on free stay on free.

---

## What Makes Animus Different

1. **Dreams as the gateway to shadow work** — no other app connects these
2. **The AI actually knows you** — "My World" context makes every interpretation unique
3. **Beautiful by default** — every dream becomes a journal page with original artwork
4. **The Dream Web** — constellation map of your unconscious, unlike anything else
5. **Ethical monetization** — all features accessible, transparent about costs, no bait-and-switch
6. **Built for the morning ritual** — voice recording optimized for the moment between sleeping and waking
7. **Social sharing as marketing** — every shared dream card is a beautifully branded Animus ad

---

## Supabase Backend

- **Project:** `xlumafywghpgallecsvh.supabase.co`
- **Tables (10):** profiles, dreams, dream_symbols, dream_conversations, shadow_exercises, world_entries, dream_connections, archetype_snapshots, pattern_reports, usage_limits
- **RLS:** All tables, users can only access their own data
- **Storage Buckets (4):** dream-images (public), dream-audio (private), report-images (public), avatars (public)
- **Edge Functions (10):** interpret-dream, generate-image, go-deeper, shadow-exercise, dream-connection, analyze-appearance (all working), dream-insights, archetype-snapshot, suggest-world-entry (placeholders)
- **Triggers:** auto-create profile on signup, update dream stats/streaks on new dream

---

## Design Language

- **Colors:** Bright cloud-white aesthetic (not dark indigo like every other dream app). Clean, airy, ethereal.
- **Typography:** Georgia serif for journal/titles, system sans for UI
- **Mood colors:** 8 moods mapped to colors (peaceful, anxious, surreal, dark, joyful, mysterious, chaotic, melancholic)
- **Jungian visuals:** Ouroboros spinner, mandala dividers, archetypal symbol decorations, floating particles
- **Animations:** Pulsing record button, smooth Reanimated transitions, dissolve effects
- **Metaphor:** Fishing/depths — luminous forms rising from dark water

---

## Seed Data

- **54 dreams** with full Jungian interpretations, 264 symbols, 162 go-deeper exchanges (`data/seed-dream-content.json`)
- **54 dream images** generated via Nano Banana (`data/dream-images/dream-{1-54}.png`)
- **Dream Web constellation data** — 7 thematic clusters, 60 connections (`data/seed-dream-connections.json`)
- **Import script** ready: `python scripts/import-seed-dreams.py --user-id <UUID>`

---

## Current Status

**MVP core is feature-complete.** Record → Interpret → Journal → Dream Map → Shadow Work flow is fully built. Auth, subscription context, ad gates, and offline queue are implemented.

**EAS build** submitted (Apr 3). Privacy policy live at huntercfinley.github.io/animus-legal/. App Store copy written at `docs/app-store-listing.md`.

**Before App Store submission:**
1. Check EAS build result, install via TestFlight
2. Deploy updated edge functions (generate-image, analyze-appearance, dream-connection)
3. Run Supabase seed import for Hunter's account
4. Enter metadata in App Store Connect
5. Submit for review

---

## Roadmap

### V1 — Launch (current build)
Everything in "Implemented" above, plus completing placeholder features.

### V2 — Growth
- Lucid dreaming tools (reality check reminders, dream sign tracking, lucidity spectrum)
- Community features (share dreams within Animus, anonymous dream feed)
- Apple Watch / sleep tracking integration
- Therapist integration / export to clinician
- Multiple languages

### V3 — Expansion
- Web version
- Guided dream incubation (set an intention before sleep, track results)
- Dream-based meditation / breathwork sessions
- Couples/family shared dream journals
- API for third-party integrations

---

## Key Files

| File | Purpose |
|------|---------|
| `Animus-Overview.md` | This file — high-level summary |
| `Animus-Research.md` | Full market research, competitors, user pain points |
| `docs/superpowers/specs/2026-03-27-animus-design.md` | Detailed design spec |
| `docs/superpowers/plans/2026-03-27-animus-implementation.md` | 21-task implementation plan |
| `data/seed-dream-content.json` | 54 dreams with interpretations, symbols, go-deeper exchanges |
| `data/seed-dream-connections.json` | Dream Web constellation clusters + 60 connections |
| `data/dream-images/` | 54 Nano Banana dream images |
| `scripts/import-seed-dreams.py` | Supabase seed data importer |
| `docs/app-store-listing.md` | App Store Connect metadata |
| `Figma` | `figma.com/design/whEsHbXEXuk3H8hBStzVSJ` — 10 UX flow pages |
