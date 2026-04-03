# Animus Cloud Design — UI Overhaul Spec

> "Being in the clouds and fishing into your subconscious."

## Overview

Animus is shifting from a dark indigo aesthetic (identical to every competing dream app) to a bright, cloud-white design that stands out in the App Store and better reflects the app's purpose: waking up, capturing a dream, then choosing to dive deeper.

The overhaul touches every screen's color scheme, typography hierarchy, and component styling. No features are added or removed — this is a pure visual transformation.

## Design Philosophy: Surface + Dive

The app has two visual zones:

**Bright Surface (80% of the app)** — cloud-white backgrounds, soft shadows, airy spacing. This is the conscious, waking world. Users spend most of their time here: recording dreams, browsing their journal, viewing the dream map, managing their world, reading interpretations.

**The Deep (20%)** — dark indigo backgrounds, glowing accents, intimate spacing. This is the unconscious. Users enter this zone intentionally: Go Deeper conversations and Shadow Work exercises. The transition should feel dramatic — a deliberate descent, not a gradual fade.

Screens by zone:

| Bright Surface | The Deep |
|---|---|
| Auth (sign-in, sign-up) | Go Deeper conversation sheet |
| Onboarding | Shadow Work exercises |
| Journal | |
| Record | |
| Dream Map | |
| Dream Detail | |
| My World | |
| Settings | |
| Import | |

## Color Palette

### Surface Colors (Bright Zone)

| Token | Hex | Usage |
|---|---|---|
| `bgSurface` | `#F0F2FF` | Primary page background — very faint blue-white |
| `bgSurfaceWarm` | `#FFF8F0` | Record screen — warm morning light tint |
| `bgCard` | `#FFFFFF` | Cards, containers, inputs |
| `border` | `#E2E4F0` | Card borders, dividers, tab bar top border |
| `borderLight` | `#EDEDF5` | Subtle inner dividers |
| `shadow` | `rgba(30, 27, 75, 0.06)` | Card shadows — soft indigo-tinted |
| `textPrimary` | `#1E1B4B` | Headings, titles, primary body text — deep indigo |
| `textSecondary` | `#4B5563` | Body text, descriptions — warm gray |
| `textMuted` | `#9CA3AF` | Dates, labels, placeholders — light gray |
| `accent` | `#6366F1` | Active tabs, links, buttons, badges — indigo |
| `accentDim` | `#818CF8` | Hover/secondary accent states |
| `accentBg` | `rgba(99, 102, 241, 0.08)` | Accent background tint for subtle highlights |

### Deep Colors (Dive Zone)

| Token | Hex | Usage |
|---|---|---|
| `deepBg` | `#1E1048` | Primary background in The Deep |
| `deepBgCard` | `#2E1B6B` | Cards/containers in The Deep |
| `deepBorder` | `#3E2E78` | Borders in The Deep |
| `deepTextPrimary` | `#E8E0F0` | Primary text in The Deep |
| `deepTextSecondary` | `#A78BFA` | Secondary text in The Deep |
| `deepAccent` | `#C4B5FD` | Accent color in The Deep — lighter indigo |

### Mood Colors (Unchanged)

These remain the same but are now used as card tints on light backgrounds rather than badges on dark backgrounds.

| Mood | Color | Card Tint (10% opacity over white) |
|---|---|---|
| peaceful | `#7EB8DA` | `#F0F7FC` |
| anxious | `#DA7E7E` | `#FDF0F0` |
| surreal | `#B87EDA` | `#F8F0FD` |
| dark | `#4A3A5A` | `#F2F0F5` |
| joyful | `#DAC87E` | `#FDFAF0` |
| mysterious | `#7E8EDA` | `#F0F2FD` |
| chaotic | `#DA7EBC` | `#FDF0F8` |
| melancholic | `#7EAADA` | `#F0F5FD` |

## Typography

### Hierarchy Change

The current app uses Georgia serif for everything. The new system splits:

- **Sans-serif** (system font) — all UI chrome: screen titles, tab labels, buttons, section headers, dates, labels, navigation, form inputs
- **Georgia serif** — dream content only: journal text, interpretation text, dream card titles/excerpts, tagline on auth screen

This creates a clear visual separation between "the app" and "the dream journal content." The serif text signals: "this is your dream speaking."

### Specific Sizes (Unchanged)

- Screen titles: 28px, sans-serif, semibold, `textPrimary`
- Section headers: 16px, sans-serif, semibold, `accent`
- Dream card titles: 14px, Georgia, medium, `textPrimary`
- Dream card excerpts: 12px, Georgia, regular, `textSecondary`
- Journal text (detail): 18px, Georgia, regular, `textPrimary`, 30px line-height
- Interpretation text: 16px, Georgia, regular, `textSecondary`, 26px line-height
- Labels/dates: 10-13px, sans-serif, regular, `textMuted`
- Buttons: 15-16px, sans-serif, semibold

## Screen-by-Screen Changes

### Auth (Sign In / Sign Up)

**Current:** Dark background, large "Animus" title, basic form.

**New:** Atmospheric entry screen. Top half: soft cloud/mist gradient illustration (light blues, whites, hint of warm light). "ANIMUS" title in deep indigo overlaid on the clouds. Tagline "Reveal what lies beneath" in indigo accent, italic serif. Bottom half: clean form on white/near-white. The visual tells the story before the user reads a word.

- Background: gradient from `#E8ECFF` (top) to `#F0F2FF` (bottom), with cloud-like soft radial shapes
- Title: 48px, sans-serif (letterpress feel with wide letter-spacing), `textPrimary`
- Tagline: 16px, Georgia italic, `accent`
- Inputs: white background, `border` stroke, `textPrimary` text
- Sign In button: `accent` background, white text
- Sign Up link: `accent` text

### Onboarding

**Current:** Dark background, step counter, text input.

**New:** Same bright surface as the rest of the app. Welcoming, clean.

- Background: `bgSurface`
- Step counter: `textMuted`
- Title: 28px, sans-serif, `textPrimary`
- Prompt: 16px, sans-serif, `textSecondary`
- Input: white background, `border` stroke
- Next button: `accent` background
- Skip: `textMuted` text

### Tab Bar

**Current:** Dark background (`#12101a`), purple active icons.

**New:** Solid white tab bar with subtle top border.

- Background: `#FFFFFF`
- Top border: 1px `border`
- Active tab: `accent` color (icon + label)
- Inactive tab: `textMuted` color
- Record button: circular, white background, 2px `accent` border, centered indigo dot. Same elevated treatment as current design.
- Height: 72px (unchanged)

### Journal Page

**Current:** Dark background, dark cards.

**New:** Bright surface with mood-tinted dream cards.

- Background: `bgSurface`
- Title: 28px, sans-serif, semibold, `textPrimary`
- Month headers: 12px, sans-serif, semibold, `accent`, uppercase, letter-spaced
- Dream cards:
  - Background: faint mood-color tint (see mood tint table above)
  - Border: 1px, mood color at 20% opacity
  - Border radius: 14px
  - Shadow: `0 2px 12px rgba(30,27,75,0.05)`
  - Layout: thumbnail image (56x56, 10px radius) + text content
  - Title: 14px, Georgia, medium, `textPrimary`
  - Excerpt: 12px, Georgia, `textSecondary`
  - Date + mood label in footer row

### Record Page

**Current:** Dark background, centered record button, duration display.

**New:** Warm morning gradient background with red record button.

- Background: `bgSurfaceWarm` — subtle warm gradient suggesting early morning light
- Duration: 48px, sans-serif, tabular-nums, `textPrimary`
- Record button: **red** (`#EF4444`) — universally recognized. White microphone icon or solid dot inside. Circular, prominent, centered.
- Hint text: sans-serif, italic, `textMuted`
- Save button: `accent` background, white text
- Discard button: text-only, `textMuted`
- Empty state: Georgia italic, `textMuted`

### Dream Detail

**Current:** Dark background, full-width image banner, dark cards for symbols.

**New:** Bright surface, clean reading layout.

- Background: `bgSurface`
- Image banner: full-width, 300px height (unchanged)
- Title: 28px, Georgia, `textPrimary`
- Date: 13px, sans-serif, `textMuted`
- Journal text: 18px, Georgia, `textPrimary`, 30px line-height
- Dividers: 1px `border`
- Section titles ("Interpretation", "Symbols"): 16px, sans-serif, semibold, `accent`
- Interpretation text: 16px, Georgia, `textSecondary`, 26px line-height
- Symbol chips: white background, `border` stroke, `textPrimary` symbol text, `textMuted` archetype text
- Share button: `accent` text on white/transparent
- "Go Deeper" button: `accent` background, white text — tapping opens The Deep

### Go Deeper (THE DEEP)

**Current:** Dark bubble chat UI.

**New:** Stays dark — this IS The Deep. Opens as a modal/sheet over the bright detail page.

- Background: `deepBg`
- User bubbles: `accent` background, white text
- AI bubbles: `deepBgCard` background, `deepTextPrimary` text
- Input: `deepBgCard` background, `deepBorder` stroke
- Header: "Going Deeper..." in `deepAccent`, with a close/back button
- The transition from bright detail to dark sheet should feel like a deliberate descent

### Dream Map

**Current:** Dark background, toggle between heatmap and dream web.

**New:** Bright surface for heatmap, stays bright for dream web constellation.

- Background: `bgSurface`
- Title: 28px, sans-serif, `textPrimary`
- Toggle buttons: white container with `border`, active = `accent` background + white text, inactive = transparent + `textMuted`
- Heatmap calendar: white card container, mood-colored cells
- Dream Web: bright background with indigo/purple node colors — the constellation stands out against the light

### Shadow Work (THE DEEP)

**Current:** Dark background.

**New:** Stays dark — this is Shadow Work, it belongs in The Deep.

- Background: `deepBg`
- Title: 28px, sans-serif, `deepTextPrimary`
- Subtitle: Georgia italic, `deepAccent`
- Exercise cards: `deepBgCard` background, `deepBorder` stroke
- Generate button: `deepAccent` text on `deepBgCard`
- The tab itself transitions the whole screen to The Deep, signaling a deliberate shift

### My World

**Current:** Dark background, dark cards.

**New:** Bright surface.

- Background: `bgSurface`
- Title: 28px, sans-serif, `textPrimary`
- Add button: `accent` text on white/transparent, `border` stroke
- World entry cards: white background, `border`, soft shadow
- Empty state: Georgia italic, `textMuted`
- Form inputs: white background, `border` stroke

### Settings

**Current:** Dark background, dark sections.

**New:** Bright surface.

- Background: `bgSurface`
- Title: 28px, sans-serif, `textPrimary`
- Section cards: white background, `border`, soft shadow
- Section titles: 16px, sans-serif, semibold, `accent`
- Info text: sans-serif, `textSecondary`
- Import Dreams button: white background, `textPrimary` title, `textMuted` subtitle
- Upgrade button: `accent` background, white text
- Sign Out button: white background, `#EF4444` (red) border + text

### Import

**Current:** Dark background (just built).

**New:** Bright surface.

- Background: `bgSurface`
- Option cards: white background, `border`, soft shadow
- Paste input: white background, `border`
- Dream preview cards: mood-tinted (same as journal cards)
- Import button: `accent` background, white text
- Progress: indigo spinner
- Done: `accent`-colored success text

## Tab Bar Transition: Shadow Work

When the user taps the Shadow Work tab, the entire screen transitions to The Deep. The tab bar itself should remain bright/white — the contrast between the dark content area and the light tab bar reinforces that The Deep is a place you visit, not the default state.

## Implementation Notes

### Theme File Changes

Replace the current `constants/theme.ts` with a dual-theme system:

```
colors.surface.* — all bright zone tokens
colors.deep.* — all dark zone tokens
colors.mood.* — mood colors (unchanged)
colors.moodTint.* — new: light-mode card tints
```

### Font Strategy

- Sans-serif: use system font (`System` on RN) — already set as `sansRegular`, `sansMedium`, `sansBold`
- Serif: keep `Georgia` — already set as `fonts.serif`
- The change is in usage, not font loading. Move screen titles, section headers, buttons, and labels from serif to sans-serif. Keep serif for `journal_text`, `interpretation`, dream card titles/excerpts, and the auth tagline.

### What Does NOT Change

- Feature behavior, navigation structure, data flow
- Mood system (8 moods, same colors)
- Component structure (same files, same props)
- Tab icons (same SVG icons, just recolored)
- Dream image generation, AI interpretation, all edge functions
- Supabase schema, RLS, offline queue
- RevenueCat integration, ad gates
