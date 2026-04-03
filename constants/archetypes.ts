export interface ArchetypeInfo {
  id: string;
  name: string;
  description: string;
  symbol: string;
}

export const ARCHETYPES: ArchetypeInfo[] = [
  { id: 'shadow', name: 'The Shadow', description: 'The hidden, repressed parts of yourself — what you deny, fear, or refuse to see.', symbol: '🌑' },
  { id: 'anima', name: 'The Anima', description: 'The feminine aspect within the masculine psyche — emotion, intuition, receptivity.', symbol: '🌙' },
  { id: 'animus', name: 'The Animus', description: 'The masculine aspect within the feminine psyche — logic, assertiveness, action.', symbol: '☀️' },
  { id: 'wise_old', name: 'The Wise Old Man/Woman', description: 'The inner guide — wisdom, knowledge, and spiritual insight.', symbol: '🦉' },
  { id: 'trickster', name: 'The Trickster', description: 'The disruptor — chaos, humor, boundary-breaking, transformation through play.', symbol: '🃏' },
  { id: 'hero', name: 'The Hero', description: 'The achiever — courage, determination, overcoming obstacles.', symbol: '⚔️' },
  { id: 'self', name: 'The Self', description: 'The unified whole — integration, balance, the center of the psyche.', symbol: '☯️' },
  { id: 'great_mother', name: 'The Great Mother', description: 'The nurturer — creation, protection, abundance, and sometimes devouring control.', symbol: '🌍' },
  { id: 'child', name: 'The Child', description: 'The innocent — new beginnings, wonder, vulnerability, potential.', symbol: '✨' },
  { id: 'persona', name: 'The Persona', description: 'The mask — the face you show the world, social roles, conformity.', symbol: '🎭' },
];

export const ARCHETYPE_MAP = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]));
