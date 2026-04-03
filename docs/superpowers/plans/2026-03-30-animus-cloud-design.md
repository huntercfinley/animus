# Animus Cloud Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Animus from a dark indigo aesthetic to a bright cloud-white "Surface + Dive" design where 80% of the app is bright and only Go Deeper + Shadow Work are dark.

**Architecture:** Replace `constants/theme.ts` with a dual-zone color system (surface + deep tokens). Update all 27 files that reference theme colors, switching backgrounds from dark to bright, purple accents to indigo, and splitting font usage (sans-serif for UI chrome, serif for dream content only). No feature, navigation, or data flow changes.

**Tech Stack:** React Native / Expo, StyleSheet.create, existing theme constants system

**Spec:** `docs/superpowers/specs/2026-03-30-animus-cloud-design.md`

---

### Task 1: Replace Theme File

**Files:**
- Modify: `constants/theme.ts`

- [ ] **Step 1: Replace theme.ts with dual-zone color system**

```typescript
// Surface colors (Bright Zone — 80% of app)
export const colors = {
  // Backgrounds
  bgSurface: '#F0F2FF',
  bgSurfaceWarm: '#FFF8F0',
  bgCard: '#FFFFFF',

  // Text
  textPrimary: '#1E1B4B',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',

  // Accent
  accent: '#6366F1',
  accentDim: '#818CF8',
  accentBg: 'rgba(99, 102, 241, 0.08)',

  // Borders & shadows
  border: '#E2E4F0',
  borderLight: '#EDEDF5',
  shadow: 'rgba(30, 27, 75, 0.06)',

  // Status
  error: '#EF4444',
  success: '#22C55E',
  record: '#EF4444',

  // Deep zone (Go Deeper, Shadow Work)
  deepBg: '#1E1048',
  deepBgCard: '#2E1B6B',
  deepBorder: '#3E2E78',
  deepTextPrimary: '#E8E0F0',
  deepTextSecondary: '#A78BFA',
  deepAccent: '#C4B5FD',

  // Mood colors (unchanged values)
  moodPeaceful: '#7EB8DA',
  moodAnxious: '#DA7E7E',
  moodSurreal: '#B87EDA',
  moodDark: '#4A3A5A',
  moodJoyful: '#DAC87E',
  moodMysterious: '#7E8EDA',
  moodChaotic: '#DA7EBC',
  moodMelancholic: '#7EAADA',
};

export const moodTints: Record<string, string> = {
  peaceful: '#F0F7FC',
  anxious: '#FDF0F0',
  surreal: '#F8F0FD',
  dark: '#F2F0F5',
  joyful: '#FDFAF0',
  mysterious: '#F0F2FD',
  chaotic: '#FDF0F8',
  melancholic: '#F0F5FD',
};

export const moodBorders: Record<string, string> = {
  peaceful: 'rgba(126, 184, 218, 0.2)',
  anxious: 'rgba(218, 126, 126, 0.2)',
  surreal: 'rgba(184, 126, 218, 0.2)',
  dark: 'rgba(74, 58, 90, 0.2)',
  joyful: 'rgba(218, 200, 126, 0.2)',
  mysterious: 'rgba(126, 142, 218, 0.2)',
  chaotic: 'rgba(218, 126, 188, 0.2)',
  melancholic: 'rgba(126, 170, 218, 0.2)',
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

- [ ] **Step 2: Verify no import errors**

Run: `cd "C:\Users\hunte\Desktop\Reality Suites\Animus" && npx tsc --noEmit 2>&1 | grep -c "theme" || echo "0 theme errors"`

Any errors here will be from removed color names (e.g., `colors.bgDeep`, `colors.purple`). These are expected — they'll be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add constants/theme.ts
git commit -m "feat(theme): replace dark palette with Surface + Dive dual-zone colors"
```

---

### Task 2: Update Root Layout + Tab Bar

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Update root layout background**

In `app/_layout.tsx`, change the Stack `contentStyle`:

```typescript
// OLD
contentStyle: { backgroundColor: colors.bgDeep },
// NEW
contentStyle: { backgroundColor: colors.bgSurface },
```

- [ ] **Step 2: Update tab bar to solid bright**

In `app/(tabs)/_layout.tsx`, update the tab bar options:

```typescript
// OLD
backgroundColor: colors.bgDark
borderTopColor: colors.border
tabBarActiveTintColor: colors.purple
tabBarInactiveTintColor: colors.textMuted
// NEW
backgroundColor: '#FFFFFF'
borderTopColor: colors.border
tabBarActiveTintColor: colors.accent
tabBarInactiveTintColor: colors.textMuted
```

Update `RecordIcon` component:

```typescript
// OLD
borderColor: colors.purple
// NEW
borderColor: colors.accent
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx "app/(tabs)/_layout.tsx"
git commit -m "feat(layout): bright root background and solid white tab bar"
```

---

### Task 3: Update Auth Screens (Atmospheric Sign In)

**Files:**
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Restyle sign-in.tsx**

Replace the styles object. Key changes:
- Container background: `colors.bgSurface` (was `colors.bgDeep`)
- Add a decorative gradient area at the top using a View with background color `#E8ECFF` — the atmospheric cloud effect
- Title: 48px, sans-serif (`fontFamily: fonts.sansBold`), `colors.textPrimary`, wide letter-spacing (6)
- Tagline: Georgia italic, `colors.accent` (was `colors.purple`)
- Inputs: `colors.bgCard` background, `colors.border` stroke, `colors.textPrimary` text
- Sign In button: `colors.accent` background (was `colors.purple`), `'#fff'` text
- Error text: `colors.error` (was hardcoded `'#ff6b6b'`)
- Sign Up link: `colors.accent` (was `colors.purple`)

Full styles replacement:

```typescript
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSurface },
  clouds: { height: 200, backgroundColor: '#E8ECFF', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.lg },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  title: { fontFamily: fonts.sansBold, fontSize: 48, color: colors.textPrimary, textAlign: 'center', letterSpacing: 6 },
  tagline: { fontFamily: fonts.serif, fontSize: 16, color: colors.accent, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.xs },
  form: { marginTop: spacing.xl },
  error: { color: colors.error, textAlign: 'center', fontSize: 14, marginBottom: spacing.sm },
  input: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.textPrimary, fontSize: 16, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: colors.accent, fontSize: 14 },
});
```

Update the JSX to include a cloud header section:
- Move the title and tagline into the `clouds` View at the top
- Keep the form in the `content` View below

- [ ] **Step 2: Restyle sign-up.tsx**

Apply the same pattern as sign-in. Key style changes identical:
- Background: `colors.bgSurface`
- Cloud header: `#E8ECFF` background
- All `colors.purple` → `colors.accent`
- All `colors.bgDeep` → `colors.bgSurface`
- Error color: `colors.error`
- Title: sans-serif with letter-spacing
- Tagline: Georgia italic

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/sign-in.tsx" "app/(auth)/sign-up.tsx"
git commit -m "feat(auth): atmospheric cloud sign-in with bright surface"
```

---

### Task 4: Update Onboarding

**Files:**
- Modify: `app/(onboarding)/index.tsx`

- [ ] **Step 1: Update styles**

All changes are color/font swaps:

```typescript
// Background
backgroundColor: colors.bgDeep → colors.bgSurface

// Title
fontFamily: fonts.serif → fontFamily: fonts.sansBold
color: colors.textPrimary (unchanged)

// Prompt text
color: colors.textSecondary (unchanged)

// Hint
color: colors.textMuted (unchanged)

// Input
backgroundColor: colors.bgCard (unchanged)
borderColor: colors.border (unchanged)
color: colors.textPrimary (unchanged)
placeholderTextColor: colors.textMuted (unchanged)

// Next button
backgroundColor: colors.purple → colors.accent

// Skip text
color: colors.textMuted (unchanged)
```

- [ ] **Step 2: Commit**

```bash
git add "app/(onboarding)/index.tsx"
git commit -m "feat(onboarding): bright surface background and sans-serif title"
```

---

### Task 5: Update Journal Page + DreamCard + MonthHeader

**Files:**
- Modify: `app/(tabs)/journal.tsx`
- Modify: `components/journal/DreamCard.tsx`
- Modify: `components/journal/MonthHeader.tsx`

- [ ] **Step 1: Update journal.tsx**

```typescript
// Container background
backgroundColor: colors.bgDeep → colors.bgSurface

// Title
fontFamily: fonts.serif → fontFamily: fonts.sansBold
color: colors.textPrimary (unchanged)

// Empty state text — keep serif (it's dream-related content)
fontFamily: fonts.serif (unchanged)
color: colors.textMuted (unchanged)
```

- [ ] **Step 2: Update DreamCard.tsx with mood-tinted cards**

Add import at top:

```typescript
import { colors, fonts, spacing, borderRadius, moodColors, moodTints, moodBorders } from '@/constants/theme';
```

Replace card styling to use mood tinting:

```typescript
// Card container — use mood tint instead of solid bgCard
const cardBg = moodTints[dream.mood || 'mysterious'] || colors.bgCard;
const cardBorder = moodBorders[dream.mood || 'mysterious'] || colors.border;

// In StyleSheet or inline:
// OLD
backgroundColor: colors.bgCard
borderColor: colors.border
// NEW (dynamic per card)
backgroundColor: cardBg
borderColor: cardBorder
borderRadius: 14  // was borderRadius.md (12)
shadowColor: '#1E1B4B'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.05
shadowRadius: 12
elevation: 2

// Remove the mood-colored left spine — the whole card is tinted now

// Image placeholder
backgroundColor: colors.bgDark → '#E8ECFF'

// Title — keep serif
fontFamily: fonts.serif (unchanged)
color: colors.textPrimary (unchanged)

// Preview text
color: colors.textSecondary (unchanged)

// Date
color: colors.textMuted (unchanged)

// Mood label color — use the mood color directly
color: moodColors[dream.mood] (dynamic)
```

- [ ] **Step 3: Update MonthHeader.tsx**

```typescript
// Month name
fontFamily: fonts.serif → fontFamily: fonts.sansBold
color: colors.textPrimary → colors.accent
fontSize: keep or change to 12
letterSpacing: 1
textTransform: 'uppercase'

// Count/subtitle
color: colors.textMuted (unchanged)
```

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/journal.tsx" components/journal/DreamCard.tsx components/journal/MonthHeader.tsx
git commit -m "feat(journal): mood-tinted dream cards on bright surface"
```

---

### Task 6: Update Record Page + RecordButton + TranscriptOverlay

**Files:**
- Modify: `app/(tabs)/record.tsx`
- Modify: `components/recording/RecordButton.tsx`
- Modify: `components/recording/TranscriptOverlay.tsx`

- [ ] **Step 1: Update record.tsx**

```typescript
// Container background — warm morning light
backgroundColor: colors.bgDeep → colors.bgSurfaceWarm

// Duration display
fontFamily: keep sans (already sans)
color: colors.textPrimary (unchanged)

// Empty state text — keep serif
fontFamily: fonts.serif (unchanged)
color: colors.textMuted (unchanged)

// Save button
backgroundColor: colors.purple → colors.accent

// Discard
color: colors.textMuted (unchanged)

// Error
color: colors.error (unchanged)
```

- [ ] **Step 2: Update RecordButton.tsx — red record button**

```typescript
// OLD
backgroundColor: colors.purple
// NEW
backgroundColor: colors.record  // #EF4444 (red)
```

Both the button fill and the pulse animation color should use `colors.record`.

- [ ] **Step 3: Update TranscriptOverlay.tsx**

```typescript
// Listening text — keep serif
fontFamily: fonts.serif (unchanged)
color: colors.textMuted (unchanged)

// Transcript text — keep serif (dream content)
fontFamily: fonts.serif (unchanged)
color: colors.textPrimary (unchanged)
```

No color changes needed here — tokens already map correctly.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/record.tsx" components/recording/RecordButton.tsx components/recording/TranscriptOverlay.tsx
git commit -m "feat(record): warm morning background with red record button"
```

---

### Task 7: Update Dream Detail Page

**Files:**
- Modify: `app/dream/[id].tsx`

- [ ] **Step 1: Update styles**

```typescript
// Container background
backgroundColor: colors.bgDeep → colors.bgSurface

// Title — keep serif (dream content)
fontFamily: fonts.serif (unchanged)
color: colors.textPrimary (unchanged)

// Date
color: colors.textMuted (unchanged)

// Journal text — keep serif
fontFamily: fonts.serif (unchanged)
color: colors.textPrimary (unchanged)

// Divider
backgroundColor: colors.border (unchanged)

// Section titles ("Interpretation", "Symbols")
fontFamily: fonts.serif → fontFamily: fonts.sansBold
fontStyle: 'italic' → remove italic
color: colors.purple → colors.accent

// Interpretation — keep serif
fontFamily: fonts.serif (unchanged)
color: colors.textSecondary (unchanged)

// Symbol chips
backgroundColor: colors.bgCard (unchanged — white)
borderColor: colors.border (unchanged)
color (symbol): colors.textPrimary (unchanged)
color (archetype): colors.textMuted (unchanged)

// Share button
backgroundColor: colors.bgCard → 'transparent' or colors.bgCard
color: colors.purple → colors.accent

// Go Deeper button
backgroundColor: colors.purple → colors.accent
```

- [ ] **Step 2: Commit**

```bash
git add "app/dream/[id].tsx"
git commit -m "feat(dream-detail): bright surface with serif dream content"
```

---

### Task 8: Update Dream Map

**Files:**
- Modify: `app/(tabs)/dream-map.tsx`

- [ ] **Step 1: Update styles**

```typescript
// Container background
backgroundColor: colors.bgDeep → colors.bgSurface

// Title
fontFamily: fonts.serif → fontFamily: fonts.sansBold
color: colors.textPrimary (unchanged)

// Toggle container
backgroundColor: colors.bgCard (unchanged — white)

// Active toggle
backgroundColor: colors.purple → colors.accent
color: '#fff' (unchanged)

// Inactive toggle
color: colors.textMuted (unchanged)
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/dream-map.tsx"
git commit -m "feat(dream-map): bright surface with indigo toggle"
```

---

### Task 9: Update Go Deeper (The Deep — Stays Dark)

**Files:**
- Modify: `components/interpretation/GoDeeper.tsx`

- [ ] **Step 1: Update to use deep zone tokens**

This component stays dark but should use the new `deep*` tokens for consistency:

```typescript
// Title
fontFamily: fonts.serif (unchanged — dream content)
color: colors.purple → colors.deepAccent

// Chat container / background (if it has one)
// Should use colors.deepBg

// User bubble
backgroundColor: colors.bgCardHover → colors.accent
color: colors.textPrimary → '#fff'

// AI bubble
backgroundColor: colors.bgCard → colors.deepBgCard
borderColor: colors.border → colors.deepBorder
color (text): colors.textSecondary → colors.deepTextPrimary
fontFamily: fonts.serif (unchanged — dream content)

// Input
backgroundColor: colors.bgCard → colors.deepBgCard
borderColor: colors.border → colors.deepBorder
color: colors.textPrimary → colors.deepTextPrimary
placeholderTextColor: colors.textMuted → colors.deepTextSecondary

// Send button
backgroundColor: colors.purple → colors.accent
color: '#fff' (unchanged)
```

- [ ] **Step 2: Commit**

```bash
git add components/interpretation/GoDeeper.tsx
git commit -m "feat(go-deeper): deep zone tokens for dark conversation UI"
```

---

### Task 10: Update Shadow Work + Components (The Deep — Stays Dark)

**Files:**
- Modify: `app/(tabs)/shadow-work.tsx`
- Modify: `components/shadow/ExerciseCard.tsx`
- Modify: `components/shadow/ExerciseSheet.tsx`

- [ ] **Step 1: Update shadow-work.tsx to deep zone**

```typescript
// Container background
backgroundColor: colors.bgDeep → colors.deepBg

// Title
fontFamily: fonts.serif → fontFamily: fonts.sansBold
color: colors.textPrimary → colors.deepTextPrimary

// Subtitle — keep serif (thematic)
fontFamily: fonts.serif (unchanged)
color: colors.purple → colors.deepAccent

// Generate button
backgroundColor: colors.bgCard → colors.deepBgCard
borderColor: colors.border → colors.deepBorder
color: colors.purple → colors.deepAccent

// Empty state — keep serif
fontFamily: fonts.serif (unchanged)
color: colors.textMuted → colors.deepTextSecondary

// Modal overlay
backgroundColor: 'rgba(0,0,0,0.5)' (unchanged)
```

- [ ] **Step 2: Update ExerciseCard.tsx to deep zone**

```typescript
// Card
backgroundColor: colors.bgCard → colors.deepBgCard
borderColor: colors.border → colors.deepBorder

// Completed border
borderColor: colors.purpleDim → colors.deepAccent

// Prompt — keep serif
color: colors.textPrimary → colors.deepTextPrimary

// Completed badge
color: colors.purple → colors.deepAccent

// Date
color: colors.textMuted → colors.deepTextSecondary
```

- [ ] **Step 3: Update ExerciseSheet.tsx to deep zone**

```typescript
// Sheet background
backgroundColor: colors.bgDark → colors.deepBg
borderColor: colors.border → colors.deepBorder

// Label
color: colors.purple → colors.deepAccent

// Prompt — keep serif
color: colors.textPrimary → colors.deepTextPrimary

// Input
backgroundColor: colors.bgCard → colors.deepBgCard
borderColor: colors.border → colors.deepBorder
color: colors.textPrimary → colors.deepTextPrimary

// Save button
backgroundColor: colors.purple → colors.accent
```

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/shadow-work.tsx" components/shadow/ExerciseCard.tsx components/shadow/ExerciseSheet.tsx
git commit -m "feat(shadow-work): deep zone tokens for shadow work screens"
```

---

### Task 11: Update My World + Components

**Files:**
- Modify: `app/(tabs)/my-world.tsx`
- Modify: `components/my-world/WorldEntryCard.tsx`
- Modify: `components/my-world/WorldEntryForm.tsx`

- [ ] **Step 1: Update my-world.tsx**

```typescript
// Container background
backgroundColor: colors.bgDeep → colors.bgSurface

// Title
fontFamily: fonts.serif → fontFamily: fonts.sansBold
color: colors.textPrimary (unchanged)

// Add button
backgroundColor: colors.bgCard (unchanged)
borderColor: colors.border (unchanged)
color: colors.purple → colors.accent

// Empty state — keep serif
fontFamily: fonts.serif (unchanged)
color: colors.textMuted (unchanged)
```

- [ ] **Step 2: Update WorldEntryCard.tsx**

```typescript
// Card
backgroundColor: colors.bgCard (unchanged — white)
borderColor: colors.border (unchanged)
// Add shadow
shadowColor: '#1E1B4B'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.06
shadowRadius: 8
elevation: 2

// Name — keep serif
color: colors.textPrimary (unchanged)

// Category
color: colors.textMuted (unchanged)

// Description
color: colors.textSecondary (unchanged)

// Relationship
color: colors.purple → colors.accent
```

- [ ] **Step 3: Update WorldEntryForm.tsx**

```typescript
// Form container
backgroundColor: colors.bgCard (unchanged)
borderColor: colors.border (unchanged)

// Category chips
// Inactive
borderColor: colors.border (unchanged)
color: colors.textMuted (unchanged)
// Active
backgroundColor: colors.purple → colors.accent
borderColor: colors.purple → colors.accent

// Input
backgroundColor: colors.bgDark → colors.bgSurface
borderColor: colors.border (unchanged)
color: colors.textPrimary (unchanged)

// Save button
backgroundColor: colors.purple → colors.accent
```

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/my-world.tsx" components/my-world/WorldEntryCard.tsx components/my-world/WorldEntryForm.tsx
git commit -m "feat(my-world): bright surface with soft shadow cards"
```

---

### Task 12: Update Settings + Import

**Files:**
- Modify: `app/settings.tsx`
- Modify: `app/import.tsx`

- [ ] **Step 1: Update settings.tsx**

```typescript
// Container background
backgroundColor: colors.bgDeep → colors.bgSurface

// Title
fontFamily: fonts.serif → fontFamily: fonts.sansBold
color: colors.textPrimary (unchanged)

// Section card
backgroundColor: colors.bgCard (unchanged)
borderColor: colors.border (unchanged)
// Add shadow
shadowColor: '#1E1B4B'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.06
shadowRadius: 8
elevation: 2

// Section title
fontFamily: fonts.serif → fontFamily: fonts.sansBold
color: colors.purple → colors.accent

// Package button
backgroundColor: colors.purple → colors.accent

// Restore text
color: colors.textMuted (unchanged)

// Import button
backgroundColor: colors.bgCardHover → colors.bgCard

// Sign out button
borderColor: colors.error (unchanged)
color: colors.error (unchanged)
```

- [ ] **Step 2: Update import.tsx**

Apply the same surface treatment throughout. All instances of:

```
colors.bgDeep → colors.bgSurface
colors.bgCard → colors.bgCard (unchanged — already white)
colors.purple → colors.accent
colors.border → colors.border (unchanged)
fonts.serif (title) → fonts.sansBold
```

Keep serif on dream preview card titles/excerpts (they're dream content).

Update mood badges to use `moodTints` for preview card backgrounds (same as journal DreamCard pattern).

- [ ] **Step 3: Commit**

```bash
git add app/settings.tsx app/import.tsx
git commit -m "feat(settings, import): bright surface styling"
```

---

### Task 13: Update Remaining Components

**Files:**
- Modify: `components/ads/AdGate.tsx`
- Modify: `components/premium/PremiumGate.tsx`
- Modify: `components/sharing/ShareCardView.tsx`
- Modify: `components/ui/OuroborosSpinner.tsx`

- [ ] **Step 1: Update AdGate.tsx**

```typescript
// Message text — keep serif (contextual/thematic)
fontFamily: fonts.serif (unchanged)
color: colors.textSecondary (unchanged)

// Continue button
backgroundColor: colors.bgCard (unchanged)
borderColor: colors.border (unchanged)
color: colors.purple → colors.accent

// Loading spinner
color: colors.purple → colors.accent
```

- [ ] **Step 2: Update PremiumGate.tsx**

```typescript
// Container
backgroundColor: colors.bgCard (unchanged)
borderColor: colors.purple → colors.accent

// Title
fontFamily: fonts.serif → fontFamily: fonts.sansBold
color: colors.textPrimary (unchanged)

// Description
color: colors.textSecondary (unchanged)

// Upgrade button
backgroundColor: colors.purple → colors.accent
```

- [ ] **Step 3: Update ShareCardView.tsx**

This component renders a branded image for social sharing. Keep its dark aesthetic — it's a self-contained visual artifact, not a screen. Update only the accent:

```typescript
// Logo/brand
color: colors.purple → colors.accent

// Everything else stays dark — the share card is its own visual context
```

- [ ] **Step 4: Update OuroborosSpinner.tsx**

```typescript
// Spinner fill
fill: colors.purple → colors.accent
```

- [ ] **Step 5: Commit**

```bash
git add components/ads/AdGate.tsx components/premium/PremiumGate.tsx components/sharing/ShareCardView.tsx components/ui/OuroborosSpinner.tsx
git commit -m "feat(components): update accent color across shared components"
```

---

### Task 14: Fix TypeScript Errors and Final Verification

**Files:**
- Possibly any file with stale references to removed color tokens

- [ ] **Step 1: Run TypeScript check**

```bash
cd "C:\Users\hunte\Desktop\Reality Suites\Animus" && npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "supabase/functions" | head -40
```

Look for errors referencing removed token names: `colors.bgDeep`, `colors.bgDark`, `colors.purple`, `colors.purpleDim`, `colors.indigo`, `colors.oceanBlue`, `colors.oceanDark`, `colors.warmGlow`, `colors.bgCardHover`.

- [ ] **Step 2: Fix any remaining references**

Search for any stale references:

```bash
grep -rn "colors\.bgDeep\|colors\.bgDark\|colors\.purple\b\|colors\.purpleDim\|colors\.indigo\|colors\.oceanBlue\|colors\.oceanDark\|colors\.warmGlow\|colors\.bgCardHover" app/ components/ lib/ --include="*.tsx" --include="*.ts"
```

Replace each:
- `colors.bgDeep` → `colors.bgSurface` (or `colors.deepBg` in deep zone)
- `colors.bgDark` → `colors.bgSurface` (or `colors.deepBg`)
- `colors.purple` → `colors.accent` (or `colors.deepAccent`)
- `colors.purpleDim` → `colors.accentDim` (or `colors.deepAccent`)
- `colors.bgCardHover` → `colors.bgCard`
- `colors.indigo` → `colors.accent`
- `colors.oceanBlue` → `colors.accent`
- `colors.oceanDark` → `colors.deepBg`
- `colors.warmGlow` → `colors.accentDim`

- [ ] **Step 3: Run TypeScript check again — expect zero new errors**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "supabase/functions" | grep "error" | wc -l
```

Only pre-existing errors (DreamWeb skia API, Deno imports) should remain.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve all stale theme token references"
```

---

### Task 15: Update Figma with Final Design (Optional)

**Files:** None (Figma only)

- [ ] **Step 1: Create a polished Figma page showing the final cloud design**

Use `mcp__figma-remote-mcp__generate_figma_design` to create a page in the Animus Figma file (`whEsHbXEXuk3H8hBStzVSJ`) showing:
- Auth screen with cloud atmosphere
- Journal with mood-tinted cards
- Record with warm background + red button
- Dream detail (bright)
- Go Deeper (dark)
- Shadow Work (dark)

This serves as the design reference for future work.

- [ ] **Step 2: Update the design spec link in project memory**
