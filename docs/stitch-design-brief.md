# Animus — Design Brief for Google Stitch

## What is Animus?

A dream journal and interpretation app rooted in Carl Jung's depth psychology. Users record dreams (voice or text), receive personalized AI interpretation, see patterns across their dream life, and do shadow work exercises. Think of it as a bridge between your conscious and unconscious mind.

**Tagline:** "Reveal what lies beneath."

---

## Core Screens (5 tabs + detail views)

### 1. Record (center tab, primary action)
- Voice recording with real-time transcription
- Large pulsing record button (red)
- Text input alternative
- After recording: AI polishes text, generates title, triggers interpretation

### 2. Journal
- Gallery of dream cards organized by month
- Each card: dream image, title, text preview, mood-colored accent stripe
- Cards should feel like they're floating — soft shadows, rounded corners
- Tapping a card opens full dream detail (interpretation, "Go Deeper" chat, image, share)

### 3. Dream Map (dual view toggle)
- **Heatmap**: GitHub-style calendar grid showing dream frequency
- **Dream Web**: Force-directed constellation graph — dreams as glowing nodes, clustered by Jungian archetype (Shadow, Self, Anima/Animus, Unconscious), lines connecting related dreams

### 4. Shadow Work
- AI-generated Jungian exercises tied to dream symbols
- Card-based UI: exercise title, prompt text, journaling space
- Should feel contemplative, slightly deeper in tone than the journal

### 5. My World (needs redesign — currently broken UX)
- Personal context that improves AI interpretation
- Three categories: **Recurring People**, **Recurring Places**, **Inner Thoughts/Themes**
- CURRENT PROBLEM: Uses a text input with `--` separators. Confusing, doesn't work.
- DESIRED: 
  - Intro screen explaining WHY this matters ("The more Animus knows about your life, the more personal and accurate your dream interpretations become")
  - Table/list for each category with a + button to add rows
  - Each row: Name + Description fields
  - Examples above each table so users understand what to enter
  - People example: "Mom — We have a complicated relationship, she lives in Ohio"
  - Places example: "Childhood house — Yellow house on Elm St, sold when I was 12"
  - Themes example: "Fear of failure — Recurring anxiety about not living up to potential"

### Detail Views
- **Dream Detail**: Full interpretation, mood, symbols list, dream image, "Go Deeper" button
- **Go Deeper**: Bubble-style chat with the AI analyst about a specific dream (5 free exchanges, 10 premium)
- **Share**: Dream card captured as branded image for social media

---

## Design Direction

### DO THIS (differentiate from competitors)
- **Bright, cloud-white aesthetic** — like being in the clouds, fishing into your subconscious
- Light backgrounds (#F0F2FF, #FFF8F0, white)
- Deep indigo text (#1E1B4B) and indigo accents (#6366F1)
- Dream cards float like clouds with soft shadows
- Depth/darkness increases as you go DEEPER into meaning (interpretation → Go Deeper → Shadow Work)
- Feels calm, airy, introspective — like waking from a dream

### DON'T DO THIS
- Dark purple/indigo/starry night backgrounds (every dream app does this — Dreamore, DreamApp, etc.)
- Heavy gradients everywhere
- Overly mystical/occult aesthetics
- Cluttered UI

### Mood Spectrum
Dreams have moods that affect card styling:
- Peaceful (soft blue), Anxious (soft red), Surreal (soft purple), Dark (muted violet), Joyful (soft gold), Mysterious (soft indigo), Chaotic (soft pink), Melancholic (soft steel blue)

### "Deep Zone" (Go Deeper, Shadow Work)
When users dive into interpretation or shadow work, the UI gradually shifts darker:
- Background: #1E1048 (deep indigo)
- Card backgrounds: #2E1B6B
- Text: #E8E0F0 (light lavender)
- Accent: #C4B5FD (soft violet)
- This contrast creates the feeling of descending into the unconscious

---

## Current Theme Tokens

```
Surface backgrounds: #F0F2FF, #FFF8F0, #FFFFFF
Text: #1E1B4B (primary), #4B5563 (secondary), #9CA3AF (muted)
Accent: #6366F1 (indigo), #818CF8 (dim)
Borders: #E2E4F0
Shadows: rgba(30, 27, 75, 0.06)
Fonts: Georgia (serif, headings), System (sans, body)
Border radius: 8/12/16/24px
```

---

## Typography

- Headings: Serif (Georgia) — timeless, journal-like
- Body: System sans-serif — clean readability
- Dream titles should feel literary
- UI elements should feel modern and minimal

---

## Target Audience

- 18-35, introspective, interested in psychology and self-growth
- Mix of casual journalers and serious Jungian enthusiasts
- People who already journal or meditate
- App Store competitors are ALL dark-themed — our bright aesthetic is a key differentiator

---

## Monetization (affects UI)

- Free tier: All features available, but gated by interstitial ads (after interpretation, after image gen, after shadow exercise)
- Premium ($4.99/mo or $35.99/yr): No ads, more daily limits, appearance-in-dreams feature, archetype profile
- Transparent ad messaging: Before each ad, show a brief message explaining why ("Animus is free because of ads. Premium removes them.")

---

## Key Interactions to Design

1. **Dream recording flow** — tap record → speak → see transcription → AI generates title + interpretation + image
2. **Dream card gallery** — scrolling through months of dreams, each with a unique image and mood color
3. **My World onboarding** — explaining why personal context matters, then adding people/places/themes to a clean table UI
4. **Go Deeper chat** — conversational UI with the AI analyst, gets progressively darker in tone
5. **Dream Web constellation** — interactive node graph, zoom/pan, tap nodes to see dream details

---

## Platform

- iOS (primary), Android (secondary)
- React Native / Expo
- Bottom tab navigation (5 tabs: Journal, Dream Map, Record, Shadow Work, My World)
- Portrait only
