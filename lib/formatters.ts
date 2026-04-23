/**
 * Shared date formatting helpers. All output uses the en-US locale so the
 * visuals stay consistent regardless of device region.
 */

export type DreamDateFormat = 'short' | 'long' | 'month-only' | 'month-year' | 'full';

const LOCALE = 'en-US';

export function formatDreamDate(iso: string | null | undefined, format: DreamDateFormat = 'short'): string {
  if (!iso) return '';
  const d = new Date(iso);
  switch (format) {
    case 'short':
      return d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString(LOCALE, { month: 'long', day: 'numeric' });
    case 'month-only':
      return d.toLocaleDateString(LOCALE, { month: 'long' });
    case 'month-year':
      return d.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
    case 'full':
      return d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
