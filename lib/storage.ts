import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * Read a local file, decode it, and upload to a Supabase storage bucket.
 * Returns the public URL on success; throws on upload failure.
 */
export async function uploadImageToSupabase(
  bucket: string,
  path: string,
  localUri: string,
  opts?: { upsert?: boolean; contentType?: string }
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  const arrayBuffer = decodeBase64(base64);
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: opts?.contentType ?? 'image/jpeg',
    upsert: opts?.upsert ?? false,
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}
