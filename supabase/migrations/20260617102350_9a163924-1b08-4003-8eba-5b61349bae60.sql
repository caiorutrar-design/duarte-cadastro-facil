DROP POLICY IF EXISTS "Public can upload cadastro photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload cadastro photos" ON storage.objects;
DROP POLICY IF EXISTS "cadastros_fotos_insert" ON storage.objects;
DROP POLICY IF EXISTS "cadastros_fotos_insert_guarded" ON storage.objects;

CREATE POLICY "cadastros_fotos_insert_guarded"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'cadastros-fotos'
  AND LOWER(COALESCE(metadata->>'mimetype', '')) IN ('image/jpeg','image/png','image/webp','image/gif')
  AND COALESCE((metadata->>'size')::bigint, 0) <= 5242880
);
