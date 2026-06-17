CREATE POLICY "Qualquer pessoa pode enviar foto de cadastro"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'cadastros-fotos');