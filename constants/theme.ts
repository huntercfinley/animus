// ============================================================
// Animus Design System — "The Ethereal Archive"
// Generated from Google Stitch design brief (Apr 2026)
// ============================================================

// --- Surface Hierarchy (The Cloud) ---
// Treat UI as physical layers of fine paper or frosted glass.
export const colors = {
  // Surface hierarchy (light → dark layering)
  surface: '#faf9ff',                    // Base canvas
  surfaceContainerLowest: '#ffffff',      // Most prominent floating cards
  surfaceContainerLow: '#f1f3ff',         // Lifted cards
  surfaceContainer: '#ebedfa',            // Mid-level containers
  surfaceContainerHigh: '#e5e7f4',        // Embedded/recessed elements (search bars)
  surfaceContainerHighest: '#e0e2ef',     // Deepest embedded elements
  surfaceDim: '#d7d9e6',

  // Legacy aliases (for files not yet migrated)
  bgSurface: '#faf9ff',
  bgSurfaceWarm: '#faf9ff',
  bgCard: '#ffffff',

  // Text — never pure black
  textPrimary: '#181b24',                 // on_surface (Deep Indigo)
  textSecondary: '#464554',               // on_surface_variant
  textMuted: '#767586',                   // outline
  textOnPrimary: '#ffffff',

  // Primary (indigo-violet gradient)
  primary: '#4648d4',
  primaryContainer: '#6063ee',
  primaryFixed: '#e1e0ff',
  primaryFixedDim: '#c0c1ff',
  inversePrimary: '#c0c1ff',

  // Secondary
  secondary: '#5b598c',
  secondaryContainer: '#c7c3fe',
  onSecondaryContainer: '#514f81',

  // Tertiary
  tertiary: '#5f5293',
  tertiaryContainer: '#786bad',
  tertiaryFixed: '#e7deff',
  tertiaryFixedDim: '#ccbeff',

  // Legacy alias
  accent: '#4648d4',
  accentDim: '#6063ee',
  accentBg: 'rgba(70, 72, 212, 0.08)',

  // Outline — Ghost borders only (never 1px solid)
  outline: '#767586',
  outlineVariant: '#c7c4d7',             // Ghost border base (use at 15% opacity)

  // Status
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  success: '#22C55E',
  record: '#EF4444',

  // Inverse
  inverseSurface: '#2d303a',
  inverseOnSurface: '#eef0fd',

  // Deep Zone (Go Deeper, Shadow Work — "The Abyss")
  deepBg: '#1E1048',
  deepBgCard: 'rgba(120, 107, 173, 0.40)', // tertiary_container at 40% + blur
  deepBorder: '#3E2E78',
  deepTextPrimary: '#e7deff',              // tertiary_fixed (light lavender)
  deepTextSecondary: '#ccbeff',            // tertiary_fixed_dim
  deepAccent: '#C4B5FD',

  // Mood colors
  moodPeaceful: '#7EB8DA',
  moodAnxious: '#DA7E7E',
  moodSurreal: '#B87EDA',
  moodDark: '#4A3A5A',
  moodJoyful: '#DAC87E',
  moodMysterious: '#7E8EDA',
  moodChaotic: '#DA7EBC',
  moodMelancholic: '#7EAADA',
  moodIntense: '#DA4A4A',
  moodTransformative: '#9B59B6',
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
  intense: '#FDF0F0',
  transformative: '#F6F0FD',
};

export const moodBorders: Record<string, string> = {
  peaceful: 'rgba(126, 184, 218, 0.15)',
  anxious: 'rgba(218, 126, 126, 0.15)',
  surreal: 'rgba(184, 126, 218, 0.15)',
  dark: 'rgba(74, 58, 90, 0.15)',
  joyful: 'rgba(218, 200, 126, 0.15)',
  mysterious: 'rgba(126, 142, 218, 0.15)',
  chaotic: 'rgba(218, 126, 188, 0.15)',
  melancholic: 'rgba(126, 170, 218, 0.15)',
  intense: 'rgba(218, 74, 74, 0.15)',
  transformative: 'rgba(155, 89, 182, 0.15)',
};

// --- Typography ---
// Noto Serif for headlines/dream content (editorial authority)
// Inter for body/labels (modern clarity)
export const fonts = {
  serif: 'NotoSerif_400Regular',
  serifItalic: 'NotoSerif_400Regular_Italic',
  serifBold: 'NotoSerif_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  // Fallbacks (used during font loading)
  serifFallback: 'Georgia',
  sansFallback: 'System',
};

// --- Spacing ---
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// --- Border Radius ---
// "Don't use standard iOS corner radii. Stick to xl or full."
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,     // Default for cards (1.5rem)
  full: 999,  // Pills, buttons, avatars
};

// --- Shadows ---
// Ambient shadows with tinted color (never pure black)
export const shadows = {
  card: {
    shadowColor: colors.onSecondaryContainer || '#514f81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  cardLifted: {
    shadowColor: colors.onSecondaryContainer || '#514f81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 5,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

// --- Mood Colors (re-export for convenience) ---
export const moodColors: Record<string, string> = {
  peaceful: colors.moodPeaceful,
  anxious: colors.moodAnxious,
  surreal: colors.moodSurreal,
  dark: colors.moodDark,
  joyful: colors.moodJoyful,
  mysterious: colors.moodMysterious,
  chaotic: colors.moodChaotic,
  melancholic: colors.moodMelancholic,
  intense: colors.moodIntense,
  transformative: colors.moodTransformative,
};
