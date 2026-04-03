export interface ArtStyle {
  id: string;
  name: string;
  promptPrefix: string;
}

export const ART_STYLES: ArtStyle[] = [
  { id: 'surrealist', name: 'Surrealist', promptPrefix: 'surrealist painting in the style of Salvador Dalí, melting forms, impossible geometry,' },
  { id: 'dark_fantasy', name: 'Dark Fantasy', promptPrefix: 'dark fantasy painting, dramatic chiaroscuro lighting, rich shadows,' },
  { id: 'watercolor', name: 'Watercolor', promptPrefix: 'soft watercolor painting, flowing colors, delicate brushstrokes, gentle bleeds,' },
  { id: 'magical_realism', name: 'Magical Realism', promptPrefix: 'magical realism painting, everyday scene with impossible elements, warm lighting,' },
  { id: 'ink_wash', name: 'Ink Wash', promptPrefix: 'East Asian ink wash painting, flowing black ink, minimalist composition,' },
  { id: 'art_nouveau', name: 'Art Nouveau', promptPrefix: 'Art Nouveau illustration, flowing organic lines, decorative borders, muted golds,' },
  { id: 'gothic', name: 'Gothic', promptPrefix: 'gothic painting, cathedral architecture, moody blue-black atmosphere,' },
  { id: 'ethereal', name: 'Ethereal', promptPrefix: 'ethereal glowing art, luminous beings, soft divine light, translucent,' },
  { id: 'folklore', name: 'Folklore', promptPrefix: 'folk art illustration, rich patterns, mythological themes, earthy palette,' },
  { id: 'expressionist', name: 'Expressionist', promptPrefix: 'expressionist painting, bold distorted colors, raw emotional energy,' },
];

const MOOD_STYLE_MAP: Record<string, string[]> = {
  peaceful: ['watercolor', 'ethereal', 'ink_wash'],
  anxious: ['expressionist', 'surrealist', 'gothic'],
  surreal: ['surrealist', 'magical_realism', 'art_nouveau'],
  dark: ['dark_fantasy', 'gothic', 'ink_wash'],
  joyful: ['watercolor', 'folklore', 'art_nouveau'],
  mysterious: ['dark_fantasy', 'ethereal', 'gothic'],
  chaotic: ['expressionist', 'surrealist', 'dark_fantasy'],
  melancholic: ['watercolor', 'ink_wash', 'ethereal'],
};

export function selectArtStyle(mood: string, previousStyleIds: string[]): ArtStyle {
  const candidates = MOOD_STYLE_MAP[mood] || ['surrealist', 'watercolor', 'dark_fantasy'];
  for (const styleId of candidates) {
    if (!previousStyleIds.includes(styleId)) {
      return ART_STYLES.find(s => s.id === styleId)!;
    }
  }
  return ART_STYLES.find(s => s.id === candidates[0])!;
}
