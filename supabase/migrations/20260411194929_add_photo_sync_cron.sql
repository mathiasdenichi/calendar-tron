/*
  # Schedule 24-hour iCloud photo sync via pg_cron

  ## Summary
  Creates a pg_cron job that calls the sync-icloud-photos edge function every 24 hours
  so photos are kept up to date automatically in the background without any client involvement.

  ## Changes
  - Enables the pg_cron and pg_net extensions if not already enabled
  - Schedules a cron job named `sync-icloud-photos-daily` to run at 3am UTC every day
  - The job calls the sync-icloud-photos edge function via HTTP POST
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'sync-icloud-photos-daily',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT current_setting('app.supabase_url', true) || '/functions/v1/sync-icloud-photos'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
