CREATE POLICY "Public read for recipe share images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'recipe-share-images');