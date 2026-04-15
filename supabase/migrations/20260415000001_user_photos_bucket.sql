-- Create user-photos bucket for profile avatars and appearance photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-photos', 'user-photos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic'];

DROP POLICY IF EXISTS "user-photos public read" ON storage.objects;
CREATE POLICY "user-photos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-photos');

DROP POLICY IF EXISTS "user-photos insert own" ON storage.objects;
CREATE POLICY "user-photos insert own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "user-photos update own" ON storage.objects;
CREATE POLICY "user-photos update own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "user-photos delete own" ON storage.objects;
CREATE POLICY "user-photos delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
