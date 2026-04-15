import pool from '../data/shadow-prompt-pool.json';

export interface ShadowPrompt {
  id: string;
  title: string;
  depth_level: 'I' | 'II' | 'III';
  prompt: string;
}

const POOL = pool as ShadowPrompt[];

export function getTodaysPrompt(): ShadowPrompt {
  const day = Math.floor(Date.now() / 86_400_000);
  return POOL[day % POOL.length];
}

export function getPromptById(id: string): ShadowPrompt | undefined {
  return POOL.find(p => p.id === id);
}
