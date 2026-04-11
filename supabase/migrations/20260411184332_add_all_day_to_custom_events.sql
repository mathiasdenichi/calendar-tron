/*
  # Add all_day column to custom_events

  1. Changes
    - `custom_events` table: add `all_day` boolean column (default false)
      - When true, the event spans the entire day and time fields are ignored for display

  2. Notes
    - Existing events default to false (not all-day), preserving current behavior
    - No destructive changes made
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_events' AND column_name = 'all_day'
  ) THEN
    ALTER TABLE custom_events ADD COLUMN all_day boolean NOT NULL DEFAULT false;
  END IF;
END $$;
