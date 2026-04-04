export type SubscriptionTier = 'free' | 'premium';
export type WorldEntryCategory = 'person' | 'place' | 'theme' | 'life_event';
export type LimitType = 'go_deeper' | 'image_refinement' | 'image_generation' | 'shadow_exercise' | 'dream_connection' | 'dream_insights';
export type ReportPeriod = 'weekly' | 'monthly';
export type DreamMood = 'peaceful' | 'anxious' | 'surreal' | 'dark' | 'joyful' | 'mysterious' | 'chaotic' | 'melancholic';
export type ConversationRole = 'user' | 'assistant';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
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
