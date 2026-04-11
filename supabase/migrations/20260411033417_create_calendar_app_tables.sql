/*
  # Calendar App Tables

  1. New Tables
    - `custom_events`
      - `id` (uuid, primary key)
      - `title` (text) - event title
      - `description` (text) - event description
      - `start_time` (timestamptz) - event start
      - `end_time` (timestamptz) - event end
      - `date` (date) - the calendar date
      - `created_at` (timestamptz)

    - `date_photos`
      - `id` (uuid, primary key)
      - `date` (date) - the calendar date
      - `photo_url` (text) - URL to stored photo
      - `filename` (text) - original filename
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow anon role to read/write (kiosk device, no user auth)

  3. Notes
    - This is a local kiosk app on a Raspberry Pi with no user auth
    - Anon policies allow the device to store and retrieve data
*/

CREATE TABLE IF NOT EXISTS custom_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS date_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  photo_url text NOT NULL,
  filename text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_photos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS custom_events_date_idx ON custom_events(date);
CREATE INDEX IF NOT EXISTS date_photos_date_idx ON date_photos(date);

CREATE POLICY "Anon can select custom events"
  ON custom_events FOR SELECT
  TO anon
  USING (auth.role() = 'anon');

CREATE POLICY "Anon can insert custom events"
  ON custom_events FOR INSERT
  TO anon
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Anon can update custom events"
  ON custom_events FOR UPDATE
  TO anon
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Anon can delete custom events"
  ON custom_events FOR DELETE
  TO anon
  USING (auth.role() = 'anon');

CREATE POLICY "Anon can select date photos"
  ON date_photos FOR SELECT
  TO anon
  USING (auth.role() = 'anon');

CREATE POLICY "Anon can insert date photos"
  ON date_photos FOR INSERT
  TO anon
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Anon can delete date photos"
  ON date_photos FOR DELETE
  TO anon
  USING (auth.role() = 'anon');
