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
