/**
 * Import dreams from ChatGPT export into Animus Supabase
 *
 * Reads dream-extractions.json and inserts each dream as a journal entry.
 * Skips dreams that already exist (by matching date + first 100 chars of text).
 *
 * Usage: npx tsx scripts/import-dreams.ts <user-email>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.ANIMUS_SUPABASE_URL || 'https://xlumafywghpgallecsvh.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.ANIMUS_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Set ANIMUS_SUPABASE_SERVICE_ROLE_KEY (sb_secret_*) environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ExtractedDream {
  date: string;
  conversation_title: string;
  dream_text: string;
  source: string;
}

// Generate a short title from dream text
function generateTitle(text: string): string {
  // Take first sentence or first 60 chars
  const firstSentence = text.split(/[.!?]\s/)[0];
  if (firstSentence.length <= 60) return firstSentence;
  return firstSentence.slice(0, 57) + '...';
}

// Guess mood from dream content
function guessMood(text: string): string {
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

// Split multi-dream entries (some entries contain numbered dreams like "1) ... 2) ...")
function splitDreams(entry: ExtractedDream): ExtractedDream[] {
  const text = entry.dream_text;

  // Check for numbered pattern like "1) ... 2) ..."
  const numberedMatch = text.match(/^\d+\)\s/m);
  if (numberedMatch) {
    const parts = text.split(/\n\n?\d+\)\s/).filter(Boolean);
    if (parts.length > 1) {
      // First part might start with "1) "
      const cleaned = parts.map(p => p.replace(/^\d+\)\s*/, '').trim());
      return cleaned.map((dreamText, i) => ({
        ...entry,
        dream_text: dreamText,
      }));
    }
  }

  return [entry];
}

async function main() {
  const userEmail = process.argv[2];
  if (!userEmail) {
    console.error('Usage: npx tsx scripts/import-dreams.ts <user-email>');
    process.exit(1);
  }

  // Find user
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, dream_count')
    .eq('email', userEmail)
    .single();

  if (profileErr || !profile) {
    console.error(`User not found: ${userEmail}`);
    console.error('You need to sign up in the app first, then run this script.');
    process.exit(1);
  }

  console.log(`\nImporting dreams for: ${profile.email} (${profile.id})`);
  console.log(`Current dream count: ${profile.dream_count}\n`);

  // Load extracted dreams
  const extractionPath = join(__dirname, '..', 'data', 'chatgpt-export', 'dream-extractions.json');
  const raw = JSON.parse(readFileSync(extractionPath, 'utf-8'));
  const entries: ExtractedDream[] = raw.dreams;

  // Split multi-dream entries
  const allDreams: ExtractedDream[] = [];
  for (const entry of entries) {
    allDreams.push(...splitDreams(entry));
  }

  console.log(`Found ${entries.length} entries → ${allDreams.length} individual dreams\n`);

  // Get existing dreams to avoid duplicates
  const { data: existing } = await supabase
    .from('dreams')
    .select('journal_text, recorded_at')
    .eq('user_id', profile.id);

  const existingSet = new Set(
    (existing || []).map(d => d.journal_text?.slice(0, 100))
  );

  let imported = 0;
  let skipped = 0;

  for (const dream of allDreams) {
    // Check for duplicate
    if (existingSet.has(dream.dream_text.slice(0, 100))) {
      console.log(`  [SKIP] ${dream.date} — already exists`);
      skipped++;
      continue;
    }

    const title = generateTitle(dream.dream_text);
    const mood = guessMood(dream.dream_text);
    const recordedAt = new Date(dream.date + 'T08:00:00Z').toISOString();

    const { error } = await supabase.from('dreams').insert({
      user_id: profile.id,
      title,
      journal_text: dream.dream_text,
      mood,
      recorded_at: recordedAt,
      created_at: recordedAt,
      model_used: 'chatgpt-import',
    });

    if (error) {
      console.error(`  [ERROR] ${dream.date}: ${error.message}`);
    } else {
      console.log(`  [OK] ${dream.date} — "${title.slice(0, 50)}" (${mood})`);
      imported++;
    }
  }

  // Update dream count
  if (imported > 0) {
    await supabase
      .from('profiles')
      .update({ dream_count: (profile.dream_count || 0) + imported })
      .eq('id', profile.id);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`IMPORT COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Total dreams now: ${(profile.dream_count || 0) + imported}`);
}

main().catch(console.error);
