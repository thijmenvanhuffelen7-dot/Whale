-- Elke minuut /api/cron/dispatch aanroepen via Supabase (gratis), voor alerts
-- die door de throttle (max 1 per wallet per 2 min) zijn blijven liggen.
-- Nodig omdat Vercel Hobby geen cron vaker dan 1x per dag toestaat.
--
-- 1. Dashboard → Database → Extensions: zet pg_cron en pg_net aan.
-- 2. Vervul <SITE> en <CRON_SECRET> en draai dit in de SQL Editor.
--    (Niet als migration: dan staat je secret in git.)

select cron.schedule(
  'whale-dispatch',
  '* * * * *',
  $$
  select net.http_get(
    url := 'https://<SITE>/api/cron/dispatch',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);

-- Stoppen:  select cron.unschedule('whale-dispatch');
