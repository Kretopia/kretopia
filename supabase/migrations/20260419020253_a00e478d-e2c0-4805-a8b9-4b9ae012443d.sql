
-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper function: scan for expired active campaigns and trigger finalize
CREATE OR REPLACE FUNCTION public.thrivefund_auto_finalize_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT id
    FROM public.campaigns
    WHERE status = 'active'
      AND deadline <= now()
    LIMIT 25
  LOOP
    PERFORM net.http_post(
      url := 'https://kwmcocsitwssrtzkdojh.supabase.co/functions/v1/thrivefund-finalize-campaign',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bWNvY3NpdHdzc3J0emtkb2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3MzYsImV4cCI6MjA3NDc0NjczNn0.ZiAk_MZuQkA0quxb7KABtlJ1cY1KUAyXw55OebmUT4c"}'::jsonb,
      body := jsonb_build_object('campaignId', c.id)
    );
  END LOOP;
END;
$$;

-- Schedule the job every 15 minutes (idempotent — unschedule if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'thrivefund-auto-finalize') THEN
    PERFORM cron.unschedule('thrivefund-auto-finalize');
  END IF;
END $$;

SELECT cron.schedule(
  'thrivefund-auto-finalize',
  '*/15 * * * *',
  $$ SELECT public.thrivefund_auto_finalize_due(); $$
);
