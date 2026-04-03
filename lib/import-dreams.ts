/**
 * Dream import parser — handles ChatGPT JSON export, plain text, and CSV formats.
 * Returns normalized dream entries ready for Supabase insertion.
 */

export interface ParsedDream {
  date: string; // ISO date string
  text: string;
  source: string; // e.g. 'chatgpt', 'text', 'csv'
}

export type ImportFormat = 'chatgpt' | 'text' | 'csv' | 'auto';

// Mood detection (same logic as admin script)
export function guessMood(text: string): string {
  const lower = text.toLowerCase();
  if (lower.match(/scary|terrif|chase|attack|kill|death|dead|die|blood|scream|monster/)) return 'dark';
  if (lower.match(/anxious|stress|late|lost|can't find|panic|worry|nervous|afraid/)) return 'anxious';
  if (lower.match(/fly|flying|float|magic|transform|shape|morph|weird|bizarre|strange/)) return 'surreal';
  if (lower.match(/happy|joy|laugh|love|beautiful|wonderful|amaz|excit|fun|party/)) return 'joyful';
  if (lower.match(/calm|peace|quiet|serene|gentle|soft|relax|meadow|garden/)) return 'peaceful';
  if (lower.match(/sad|cry|tear|miss|gone|left|alone|lonely|melanchol/)) return 'melancholic';
  if (lower.match(/chaos|storm|crash|destroy|explosion|fire|flood|tsunami|earthquake/)) return 'chaotic';
  return 'mysterious';
}

// Generate a short title from dream text
export function generateTitle(text: string): string {
  const firstSentence = text.split(/[.!?]\s/)[0];
  if (firstSentence.length <= 60) return firstSentence;
  return firstSentence.slice(0, 57) + '...';
}

/**
 * Detect file format from content
 */
export function detectFormat(content: string): ImportFormat {
  const trimmed = content.trim();

  // ChatGPT export: array of conversation objects with "mapping" key
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      // Direct dream-extractions.json format (our own export)
      if (parsed.dreams && Array.isArray(parsed.dreams)) return 'chatgpt';
      // Raw ChatGPT conversations export
      if (Array.isArray(parsed) && parsed[0]?.mapping) return 'chatgpt';
      // Generic JSON array with date/text fields
      if (Array.isArray(parsed) && parsed[0]?.date) return 'chatgpt';
    } catch { /* not valid JSON */ }
  }

  // CSV: has comma-separated header line
  const firstLine = trimmed.split('\n')[0];
  if (firstLine.includes(',') && (
    firstLine.toLowerCase().includes('date') ||
    firstLine.toLowerCase().includes('dream') ||
    firstLine.toLowerCase().includes('text')
  )) {
    return 'csv';
  }

  return 'text';
}

/**
 * Parse ChatGPT export formats
 */
function parseChatGPT(content: string): ParsedDream[] {
  const parsed = JSON.parse(content);
  const dreams: ParsedDream[] = [];

  // Format 1: Our dream-extractions.json format
  if (parsed.dreams && Array.isArray(parsed.dreams)) {
    for (const d of parsed.dreams) {
      // Split numbered dreams ("1) ... 2) ...")
      const splits = splitNumberedDreams(d.dream_text);
      for (const text of splits) {
        dreams.push({ date: d.date, text: text.trim(), source: 'chatgpt' });
      }
    }
    return dreams;
  }

  // Format 2: Raw ChatGPT conversations export
  if (Array.isArray(parsed) && parsed[0]?.mapping) {
    for (const conv of parsed) {
      const createTime = conv.create_time;
      const date = createTime
        ? new Date(createTime * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      // Extract user messages from mapping
      for (const nodeId of Object.keys(conv.mapping)) {
        const node = conv.mapping[nodeId];
        const msg = node.message;
        if (!msg || msg.author?.role !== 'user') continue;
        const parts = msg.content?.parts;
        if (!parts || !parts.length) continue;

        const text = parts.join('\n').trim();
        // Only include if it looks like a dream description (>50 chars, mentions dream-related words)
        if (text.length > 50 && /dream|dreamt|dreamed|i was|i had/i.test(text)) {
          const splits = splitNumberedDreams(text);
          for (const dreamText of splits) {
            dreams.push({ date, text: dreamText.trim(), source: 'chatgpt' });
          }
        }
      }
    }
    return dreams;
  }

  // Format 3: Simple JSON array [{date, text}, ...]
  if (Array.isArray(parsed)) {
    for (const d of parsed) {
      const text = d.text || d.dream_text || d.content || d.dream || '';
      const date = d.date || new Date().toISOString().split('T')[0];
      if (text.trim()) {
        dreams.push({ date, text: text.trim(), source: 'chatgpt' });
      }
    }
    return dreams;
  }

  return dreams;
}

/**
 * Parse plain text — dreams separated by blank lines or date headers
 */
function parsePlainText(content: string): ParsedDream[] {
  const dreams: ParsedDream[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Try to split by date-like headers (e.g., "2025-03-15" or "March 15, 2025" or "03/15/2025")
  const datePattern = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/im;

  const blocks = content.split(/\n\s*\n/).filter(b => b.trim().length > 20);

  for (const block of blocks) {
    const trimmed = block.trim();
    const dateMatch = trimmed.match(datePattern);
    let date = today;
    let text = trimmed;

    if (dateMatch) {
      const raw = dateMatch[1];
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        date = parsed.toISOString().split('T')[0];
        text = trimmed.slice(dateMatch[0].length).trim();
      }
    }

    if (text.length > 20) {
      dreams.push({ date, text, source: 'text' });
    }
  }

  // If no blocks found, treat whole content as one dream
  if (dreams.length === 0 && content.trim().length > 20) {
    dreams.push({ date: today, text: content.trim(), source: 'text' });
  }

  return dreams;
}

/**
 * Parse CSV — expects header row with date and text/dream columns
 */
function parseCSV(content: string): ParsedDream[] {
  const dreams: ParsedDream[] = [];
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return dreams;

  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
  const dateIdx = header.findIndex(h => h === 'date' || h === 'recorded_at' || h === 'created_at');
  const textIdx = header.findIndex(h =>
    h === 'dream' || h === 'text' || h === 'dream_text' || h === 'content' || h === 'journal_text' || h === 'description'
  );

  if (textIdx === -1) return dreams;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const text = (cols[textIdx] || '').trim();
    const date = dateIdx >= 0 ? (cols[dateIdx] || today).trim() : today;

    if (text.length > 10) {
      dreams.push({ date, text, source: 'csv' });
    }
  }

  return dreams;
}

/**
 * Simple CSV line parser that handles quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map(s => s.replace(/^"|"$/g, ''));
}

/**
 * Split numbered dreams like "1) dream text 2) other dream"
 */
function splitNumberedDreams(text: string): string[] {
  const numberedMatch = text.match(/^\d+\)\s/m);
  if (numberedMatch) {
    const parts = text.split(/\n\n?\d+\)\s/).filter(Boolean);
    if (parts.length > 1) {
      return parts.map(p => p.replace(/^\d+\)\s*/, '').trim());
    }
  }
  return [text];
}

/**
 * Main parse function — auto-detects format and returns dreams
 */
export function parseDreams(content: string, format?: ImportFormat): ParsedDream[] {
  const detected = format === 'auto' || !format ? detectFormat(content) : format;

  switch (detected) {
    case 'chatgpt':
      return parseChatGPT(content);
    case 'csv':
      return parseCSV(content);
    case 'text':
    default:
      return parsePlainText(content);
  }
}
