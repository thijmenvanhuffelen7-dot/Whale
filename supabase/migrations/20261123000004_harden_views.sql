-- De site leest alles server-side met de service role. Publieke views dus
-- niet meer via de anon key bereikbaar, en als security_invoker
-- (Supabase-advisor: security_definer_view). De 15-minuten-vertraging voor
-- Free zit nog steeds in de view; Pro krijgt realtime data via /api/feed.
alter view public_events set (security_invoker = true);
alter view public_wallets set (security_invoker = true);
alter view public_wallet_stats set (security_invoker = true);
alter view public_stats set (security_invoker = true);
revoke all on public_events, public_wallets, public_wallet_stats, public_stats from anon, authenticated;

-- Trigger-functie hoeft niet via de API aanroepbaar te zijn.
revoke execute on function handle_new_user() from public, anon, authenticated;
