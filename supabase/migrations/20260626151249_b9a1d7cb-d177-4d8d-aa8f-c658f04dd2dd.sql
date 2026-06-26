
-- Drop existing anon insert policies on cadastros-fotos to replace with stricter one
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND cmd='INSERT'
      AND qual IS NULL
      AND policyname ILIKE '%cadastros%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Also drop any prior policy with this exact name
DROP POLICY IF EXISTS "Anon can upload cadastros-fotos to uploads UUID path" ON storage.objects;
DROP POLICY IF EXISTS "Anon insert cadastros-fotos" ON storage.objects;
DROP POLICY IF EXISTS "anon_insert_cadastros_fotos" ON storage.objects;

CREATE POLICY "Anon can upload cadastros-fotos to uploads UUID path"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'cadastros-fotos'
  AND name ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif)$'
  AND (COALESCE((metadata->>'size')::bigint, 0) <= 5242880)
  AND (lower(COALESCE(metadata->>'mimetype','')) IN ('image/jpeg','image/png','image/webp','image/gif'))
);
