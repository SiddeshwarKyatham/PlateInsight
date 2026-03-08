-- ==========================================
-- PLATEINSIGHT STORAGE POLICIES
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('plates', 'plates', true)
ON CONFLICT (id) DO NOTHING;

-- Re-runnable: drop existing policies first
DROP POLICY IF EXISTS "Public can upload plate images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view plate images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete plate images" ON storage.objects;

-- 2. Allow anonymous public uploads (Students)
CREATE POLICY "Public can upload plate images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'plates'
  AND array_length(string_to_array(name, '/'), 1) = 4
);

-- 3. Allow anonymous public reading (For the Admin UI and AI to see the image)
CREATE POLICY "Public can view plate images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'plates');

-- 4. Allow Admin to delete images (Optional Cleanup)
CREATE POLICY "Admins can delete plate images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'plates');
