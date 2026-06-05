-- Cria buckets públicos para capas de livros e fotos de autores
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('book-covers', 'book-covers', true),
  ('author-photos', 'author-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para book-covers: leitura pública, escrita apenas para admins
CREATE POLICY "book_covers_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-covers');

CREATE POLICY "book_covers_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'book-covers'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "book_covers_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'book-covers'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "book_covers_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'book-covers'
    AND auth.role() = 'authenticated'
  );

-- Políticas para author-photos: leitura pública, escrita apenas para admins
CREATE POLICY "author_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'author-photos');

CREATE POLICY "author_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'author-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "author_photos_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'author-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "author_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'author-photos'
    AND auth.role() = 'authenticated'
  );
