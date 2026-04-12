# Animus Design System — "The Ethereal Archive"

> A bright, cloud-light dream journal with a dark contemplative shadow zone underneath. Animus treats the UI as physical layers of fine paper and frosted glass — most of the app feels like morning light through linen curtains, and a small portion feels like staring into deep water at night. Always one or the other; never muddy in between.

**Tagline:** Reveal what lies beneath.
**Audience:** Introspective adults 18–35 who keep dream journals, do shadow work, and want a private space that feels closer to a Moleskine than to social media.
**Platform:** React Native + Expo (mobile-first, iOS-leading).

---

## 1. Visual Theme & Atmosphere

Animus has a **dual-zone architecture** — the entire visual system flips between two coherent moods depending on what the user is doing:

- **Surface (Bright Cloud)** — 80% of the app. The Journal, Dream Map, Record button, and most of My World. Cloud-white indigo-tinted background, ample whitespace, ghosted borders, soft ambient shadows tinted in lavender. Feels like a printed dream notebook lit by morning sun.
- **Dive (Deep Zone)** — 20% of the app. Shadow Work, "Go Deeper" interpretation flows, and contemplative reading. Deep indigo-violet background, frosted-glass cards, lavender text, glowing accents. Feels like meditation in a quiet temple at night.

The two zones never blend on the same screen. Transitions between them are slow, deliberate, and announced (a slide-up sheet, a fade-through, a deliberate route change) — they should feel like the user is choosing to descend, not stumbling into a different app.

**Key Characteristics:**
- Always-warm-cool indigo cast — pure white is forbidden in the Bright zone (use `surface #faf9ff` instead) and pure black is forbidden in the Deep zone (use `deepBg #1E1048`).
- Ghost borders only — borders are `outlineVariant` at 10–15% opacity, never solid 1px lines.
- Editorial typography — dream content is set in Noto Serif (serif authority), UI chrome is set in Inter (modern clarity). Never mix them inside one component.
- Mood-coded content — every dream card carries a 4px tinted left stripe in one of 10 mood colors. The card body itself uses an even paler tint of the same hue (`moodTints`).
- Generous whitespace and a strict layered surface hierarchy — the user should always be able to tell which surface is floating above which.

---

## 2. Color Palette & Roles

### Surface Hierarchy (Bright Zone — light → dark layering)

| Token | Hex | Role |
|---|---|---|
| `surface` | `#faf9ff` | Base canvas — every screen background |
| `surfaceContainerLowest` | `#ffffff` | Most prominent floating cards (dream cards, modals) |
| `surfaceContainerLow` | `#f1f3ff` | Lifted cards, secondary content |
| `surfaceContainer` | `#ebedfa` | Mid-level containers, segmented controls |
| `surfaceContainerHigh` | `#e5e7f4` | Embedded/recessed elements (search bar, inputs) |
| `surfaceContainerHighest` | `#e0e2ef` | Deepest embedded elements (chip wells) |
| `surfaceDim` | `#d7d9e6` | Inactive backgrounds, disabled states |

### Text (Bright Zone)

| Token | Hex | Role |
|---|---|---|
| `textPrimary` | `#181b24` | Headings, dream content, key UI labels |
| `textSecondary` | `#464554` | Body copy, metadata |
| `textMuted` | `#767586` | Captions, timestamps, helper text |
| `textOnPrimary` | `#ffffff` | Text on filled primary buttons |

> **Never use `#000000` for text.** All text in the Bright zone is desaturated indigo. Pure black breaks the morning-light feeling.

### Accent (Indigo-Violet)

| Token | Hex | Role |
|---|---|---|
| `primary` | `#4648d4` | Primary CTAs, active tab, links, focus rings |
| `primaryContainer` | `#6063ee` | Hover/pressed state for primary |
| `primaryFixed` | `#e1e0ff` | Filled-tonal button background |
| `primaryFixedDim` | `#c0c1ff` | Filled-tonal pressed state |
| `accentBg` | `rgba(70, 72, 212, 0.08)` | Subtle accent fill behind icons |

### Borders (Ghost Only)

| Token | Hex | Role |
|---|---|---|
| `outline` | `#767586` | Reserved — almost never used as a 1px border |
| `outlineVariant` | `#c7c4d7` | Ghost border base — apply at 10–15% opacity |

### Deep Zone (The Abyss)

| Token | Hex | Role |
|---|---|---|
| `deepBg` | `#1E1048` | Base canvas for Shadow Work and Go Deeper |
| `deepBgCard` | `rgba(120, 107, 173, 0.40)` | Frosted-glass card on deep background (uses blur) |
| `deepBorder` | `#3E2E78` | Subtle separator lines in deep zone |
| `deepTextPrimary` | `#e7deff` | Headings and body in deep zone (light lavender) |
| `deepTextSecondary` | `#ccbeff` | Secondary text in deep zone |
| `deepAccent` | `#C4B5FD` | Accent text, highlights, glowing CTA |

### Mood Colors (Dream Cards)

10-color system for tagging dreams. Each mood has three forms: a saturated stripe color, a 10% white-tinted card background (`moodTints`), and a 15% border (`moodBorders`).

| Mood | Stripe | Tint | Border |
|---|---|---|---|
| Peaceful | `#7EB8DA` | `#F0F7FC` | `rgba(126,184,218,0.15)` |
| Anxious | `#DA7E7E` | `#FDF0F0` | `rgba(218,126,126,0.15)` |
| Surreal | `#B87EDA` | `#F8F0FD` | `rgba(184,126,218,0.15)` |
| Dark | `#4A3A5A` | `#F2F0F5` | `rgba(74,58,90,0.15)` |
| Joyful | `#DAC87E` | `#FDFAF0` | `rgba(218,200,126,0.15)` |
| Mysterious | `#7E8EDA` | `#F0F2FD` | `rgba(126,142,218,0.15)` |
| Chaotic | `#DA7EBC` | `#FDF0F8` | `rgba(218,126,188,0.15)` |
| Melancholic | `#7EAADA` | `#F0F5FD` | `rgba(126,170,218,0.15)` |
| Intense | `#DA4A4A` | `#FDF0F0` | `rgba(218,74,74,0.15)` |
| Transformative | `#9B59B6` | `#F6F0FD` | `rgba(155,89,182,0.15)` |

### Status & Functional

| Token | Hex | Role |
|---|---|---|
| `error` | `#ba1a1a` | Validation errors, destructive confirmation |
| `errorContainer` | `#ffdad6` | Error message background |
| `success` | `#22C55E` | Saved confirmations |
| `record` | `#EF4444` | The voice-record button — always this red, no other surface uses it |

---

## 3. Typography Rules

**Two-font system, strictly separated by purpose:**

- **Noto Serif** — All dream content, all headlines, anything that should feel like printed editorial text. The serif carries the "this is a real journal" weight.
- **Inter** — All UI chrome: buttons, tabs, labels, metadata, timestamps, settings. Never used inside dream content.

| Font Token | Usage |
|---|---|
| `fonts.serif` (`NotoSerif_400Regular`) | Dream body text, long-form content |
| `fonts.serifItalic` | Dream titles, emphasized phrases inside dream content |
| `fonts.serifBold` (`NotoSerif_700Bold`) | Section headings inside dream content |
| `fonts.sans` (`Inter_400Regular`) | Body UI labels, metadata, timestamps |
| `fonts.sansMedium` (`Inter_500Medium`) | Tab labels, button labels, list item titles |
| `fonts.sansSemiBold` (`Inter_600SemiBold`) | Card titles, section headings outside dream content |
| `fonts.sansBold` (`Inter_700Bold`) | Reserved — top-level screen titles only |

### Hierarchy

| Role | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Screen title | Inter | 28–32 | 700 | One per screen, tight tracking |
| Section heading | Inter | 20 | 600 | Above grouped lists |
| Card title | Inter | 17 | 600 | Dream entry titles in list view |
| Dream body | Noto Serif | 17 | 400 | The actual dream text — line-height 1.6 |
| UI label | Inter | 15 | 500 | Tabs, buttons, list items |
| Caption | Inter | 13 | 400 | Timestamps, "Edited 2h ago" |
| Micro | Inter | 11 | 500 | Tag chips, metadata |

### Principles

- Headlines are tight, body is generous — `letter-spacing: -0.2` for headlines, `letter-spacing: 0` for body, `line-height: 1.6` for dream content.
- Never set dream content in sans-serif. Never set tab labels in serif. The split is the system.
- Dream titles in italics inside the entry; in regular weight inside the list. The italic is reserved for "in context."

---

## 4. Component Stylings

### Buttons

- **Primary CTA:** filled `primary` background, `textOnPrimary` label, `borderRadius.full`, `paddingVertical: 16`, `paddingHorizontal: 24`. Inter Medium 15. No border. Pressed state: `primaryContainer`.
- **Secondary:** `primaryFixed` background, `primary` label, same shape. Used for non-destructive secondary actions ("Save draft").
- **Ghost:** transparent background, `primary` label, no border. Used inside cards.
- **Destructive:** `error` label on transparent background. Confirmation modal uses `errorContainer` background.
- **Record button:** circular, 72×72, solid `record #EF4444`, white microphone icon. The only red surface in the app. Lives in the bottom tab bar center.

### Cards

- **Dream card (Bright):** `surfaceContainerLowest` background, `borderRadius.xl` (24), `shadows.card` (lavender-tinted ambient shadow), 16px padding, 4px left stripe in mood color, mood tint as background fill if applied, ghost border in mood border color. No 1px solid borders ever.
- **Dream card (Deep):** `deepBgCard` background with blur, `borderRadius.xl`, no shadow (use border glow instead — 1px `deepBorder` at 30% opacity).
- **List card:** `surfaceContainerLow` background, `borderRadius.lg` (16), `shadows.card`, used for non-dream content (settings groups, reminder lists).

### Inputs

- **Text input:** `surfaceContainerHigh` background (recessed feel), no border, `borderRadius.md` (12), 12px padding. Focus state adds a 2px `primary` ring at 40% opacity. Placeholder is `textMuted`.
- **Search bar:** `surfaceContainerHigh` background, `borderRadius.full`, leading magnifying-glass icon in `textMuted`. Always lives at the top of list screens.
- **Multi-line dream entry:** Noto Serif, `surface` background, no visible border, generous padding (24px). The chrome disappears so the user feels like they're writing on paper.

### Navigation

- **Bottom tab bar:** 5 tabs — Journal, Dream Map, Record (center, oversized), Shadow Work, My World. White-ish background (`surfaceContainerLowest`) with a top border in `outlineVariant` at 15%. Active tab uses `primary` icon + label, inactive uses `textMuted`. The Record tab is the circular button described above and visually breaks the bar.
- **Top bar:** No solid background — sits on `surface`. Title in Inter 28/700, subtitle in Inter 13/400 `textMuted`. Trailing icon buttons in `textSecondary`.

### Distinctive Components

- **Mood stripe** — every dream card has one. 4px wide, runs the full height of the card on the leading edge, color = `moodColors[dreamMood]`. The card background fill uses `moodTints[dreamMood]` at full strength. The card border uses `moodBorders[dreamMood]`. Together they create a faint, recognizable signature for each mood without looking like color-coding.
- **Go Deeper sheet** — when a user taps "Go Deeper" on a dream, a half-sheet slides up from the bottom that transitions from Bright zone to Deep zone. The first 30% of the slide-up is still Bright, the rest is Deep. The user feels themselves descending.
- **Ananda-style reflection card** — frosted Deep zone card with a `deepAccent` glow on the leading icon. Used for AI-generated reflections in Shadow Work.

---

## 5. Layout Principles

### Spacing System (Strict 8pt grid, with 4pt subdivision)

| Token | Value | Usage |
|---|---|---|
| `xs` | 4 | Icon padding, tight inline gaps |
| `sm` | 8 | Chip padding, compact list rows |
| `md` | 16 | Default card padding, list item rows |
| `lg` | 24 | Section gaps, card-to-card vertical rhythm |
| `xl` | 32 | Screen-edge padding on larger screens, major section breaks |
| `xxl` | 48 | Hero-section padding, between major content blocks |

### Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `sm` | 8 | Tag chips, small inline pills |
| `md` | 12 | Inputs, small cards, segmented controls |
| `lg` | 16 | List cards, settings rows |
| `xl` | 24 | Dream cards (default), modals |
| `full` | 999 | Buttons, avatars, search bars, the Record button |

> **Don't use standard iOS corner radii (10, 14, 20).** Stick to the scale.

### Whitespace Philosophy

- 16px is the floor for any padding inside content. Never let text touch a card edge by less than 16px.
- 24px is the rhythm between sibling cards in a vertical list.
- 32px is the rhythm between sections (a section heading and the next section heading).
- Top and bottom of each screen reserve 24–32px before the first content. Empty space is the design — it makes the app feel like a magazine, not a feed.

### Layered Surface Hierarchy

The 7-step `surfaceContainer*` ladder exists so any surface can sit visibly above or below another. When designing a screen, always pick the right rung — a card on `surface` is a `surfaceContainerLowest`; a card on `surfaceContainerLow` is a `surfaceContainerHigh`; etc. This prevents cards from disappearing into the background.

---

## 6. Depth & Elevation

Animus uses **ambient lavender-tinted shadows**, never pure black drop shadows.

| Token | Y | Blur | Opacity | Color | Use |
|---|---|---|---|---|---|
| `shadows.card` | 4 | 24 | 0.05 | `#514f81` (onSecondaryContainer) | Default for dream cards & list cards |
| `shadows.cardLifted` | 8 | 32 | 0.06 | `#514f81` | Modals, half-sheets, focused cards |
| `shadows.none` | 0 | 0 | 0 | — | Inputs, embedded recessed elements |

### Philosophy

- Shadows are **ambient and tinted**, not drop shadows. They suggest "this thing is floating in soft light," not "this thing is casting a hard shadow."
- The Deep zone uses **glow borders instead of shadows** — a 1px `deepBorder` border at 30% opacity simulates the edge of a frosted-glass card lit from inside.
- Recessed elements (search bars, inputs) use a **darker surface tier** (`surfaceContainerHigh`) instead of inset shadows. The recess is implied by surface color, not by lighting.

---

## 7. Do's and Don'ts

### Do
- Use Noto Serif for dream content and Inter for UI chrome — keep the split religious.
- Use `surface #faf9ff` and `deepBg #1E1048` as canvases. Both have a tint; both refuse pure white/black.
- Tag every dream with a mood and let the mood drive the card's stripe, tint, and border.
- Use ghost borders (`outlineVariant` at 10–15% opacity) instead of 1px solid lines.
- Let the Bright and Deep zones be obviously, dramatically different. The user should know which zone they're in within half a second.
- Use the Record button as a fixed visual anchor — center of the bottom bar, always red, always circular.
- Prefer `shadows.card` for default elevation. Reserve `shadows.cardLifted` for modals.

### Don't
- Don't use `#FFFFFF` as a screen background. Use `surface #faf9ff`.
- Don't use `#000000` for text. Use `textPrimary #181b24`.
- Don't mix Noto Serif and Inter inside the same paragraph or component.
- Don't add 1px solid borders anywhere. Use ghost borders or layered surfaces.
- Don't show the user a screen that is half-Bright and half-Deep — pick one zone per screen.
- Don't put red anywhere except the Record button. Red has one job here.
- Don't use standard iOS corner radii (10, 14, 20). Use the borderRadius scale.
- Don't use cool drop shadows or pure black shadows. Tint everything `#514f81`.
- Don't gamify. No streaks, no XP, no badges. Animus is private and quiet.

---

## 8. Interaction & Motion

- **Surface → Dive transitions** are slow (400–500ms), use a custom easing that decelerates, and visibly cross the color zones. The user must feel the descent.
- **Card press** uses a subtle scale (`0.98`) and shadow lift (`shadows.card → shadows.cardLifted`) over 120ms.
- **Record button press** uses a brief outer ring pulse, then a steady ambient glow while recording. No bounce.
- **Mood stripe color changes** animate via cross-fade, never a snap.
- **Half-sheets** slide up from the bottom with a 350ms ease-out, drag-to-dismiss enabled.
- **Tab switches** are instant — no slide animation. Tabs are destinations, not pages in a book.
- **Long lists** use lazy rendering and a faint top fade-mask so scroll feels weightless.

---

## 9. Agent Prompt Guide

When asking an AI agent (Claude, Stitch, Gemini) to generate a screen for Animus, give it this much context:

### Quick Reference Block

```
App: Animus — dream journal & shadow-work companion
Zone: Bright (Surface) | Deep (Dive)   ← always specify
Background: Bright = #faf9ff, Deep = #1E1048
Text: Bright = #181b24 on light, Deep = #e7deff on dark
Accent: #4648d4 (primary indigo-violet)
Type: Inter for UI, Noto Serif for dream content
Cards: borderRadius 24, ambient lavender shadow rgba(81,79,129,0.05)
Borders: ghost only — outline color #c7c4d7 at 10–15% opacity
Mood system: 10 mood colors, each with stripe + tint + border (see DESIGN.md §2)
NO: pure white, pure black, 1px solid borders, mixing serif and sans, drop shadows
```

### Example Prompts

**Good:** "Generate the Animus Journal screen (Bright zone). Show a vertical list of 6 dream cards on `surface #faf9ff`. Each card has `borderRadius 24`, a 4px left stripe in its mood color, a mood-tint background fill, and ambient lavender shadow. Card title in Inter 17/600, two lines of dream preview in Noto Serif 15/400, timestamp in Inter 13/400 textMuted. Mood stripe colors should vary across the list. The bottom tab bar has 5 tabs with the Record button as a 72×72 red circle in the center."

**Good:** "Generate the Animus Shadow Work screen (Deep zone). Background `deepBg #1E1048`. Show a single frosted-glass reflection card centered, `borderRadius 24`, `deepBgCard` background with blur, 1px `deepBorder` at 30% opacity, no shadow. Card title in Inter 20/600 in `deepTextPrimary #e7deff`, body in Noto Serif 17/400 in `deepTextSecondary #ccbeff`. A 'Continue' button at the bottom in `deepAccent #C4B5FD`."

**Bad:** "Make a dream journal screen, modern, indigo theme." (No zone, no tokens, no type system, no mood handling — the agent will improvise and miss the system.)

### Iteration Guide

If the output is wrong, name the violated rule from §7 (Do's and Don'ts) and ask the agent to re-render fixing only that. Never re-prompt with vague feedback like "make it nicer" — Animus's design is rule-based, so corrections should be rule-based.

---

*This document is the source of truth for Animus visual design. When the design evolves, update the relevant section here — but keep the 9-section structure stable. Stitch and Claude both consume this file.*
