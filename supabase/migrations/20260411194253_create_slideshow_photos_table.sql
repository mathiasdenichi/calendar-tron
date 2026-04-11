/*
  # Create slideshow_photos table

  ## Summary
  Adds a table to cache iCloud photos fetched by the edge function for fast local loading.

  ## New Tables
  - `slideshow_photos`
    - `id` (uuid, primary key)
    - `guid` (text, unique) - the iCloud photo GUID to deduplicate
    - `storage_url` (text) - public URL of the photo stored in Supabase Storage
    - `original_url` (text) - original iCloud URL (fallback)
    - `width` (integer)
    - `height` (integer)
    - `created_at` (timestamptz)
    - `synced_at` (timestamptz) - when this photo was last synced from iCloud

  ## Security
  - RLS enabled
  - Public SELECT allowed (photos are not user-specific, this is a display app)
  - INSERT/UPDATE restricted to service role (edge function)
*/

CREATE TABLE IF NOT EXISTS slideshow_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guid text UNIQUE NOT NULL,
  storage_url text,
  original_url text NOT NULL,
  thumb_url text,
  width integer DEFAULT 0,
  height integer DEFAULT 0,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE slideshow_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read slideshow photos"
  ON slideshow_photos
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert slideshow photos"
  ON slideshow_photos
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update slideshow photos"
  ON slideshow_photos
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete slideshow photos"
  ON slideshow_photos
  FOR DELETE
  TO service_role
  USING (true);
