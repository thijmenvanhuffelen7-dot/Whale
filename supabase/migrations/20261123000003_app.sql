-- Fase 8-11: website, gebruikers, watchlists, abonnementen, admin.

-- ---------------------------------------------------------------------------
-- Profielen (1 per auth-user, automatisch aangemaakt)
-- ---------------------------------------------------------------------------
create type plan as enum ('free', 'pro');

create table profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,
  plan                plan not null default 'free',
  stripe_customer_id  text unique,
  telegram_user_id    bigint unique,
  telegram_username   text,
  -- Eenmalige code voor /start <code> in de bot
  telegram_link_code  text unique default encode(gen_random_bytes(9), 'hex'),
  notify_telegram     boolean not null default true,
  notify_email        boolean not null default false,
  created_at          timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;
-- Gebruikers mogen hun eigen profiel lezen. Schrijven alleen via de server.
create policy "eigen profiel lezen" on profiles for select to authenticated using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Watchlist: wallets en tokens die een gebruiker volgt, met eigen drempel
-- ---------------------------------------------------------------------------
create type watch_kind as enum ('wallet', 'token');

create table watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  kind        watch_kind not null,
  chain       chain not null,
  address     text not null,
  label       text,
  min_usd     numeric(20, 2) not null default 10000,
  created_at  timestamptz not null default now(),
  unique (user_id, kind, chain, address)
);
create index watchlist_lookup_idx on watchlist (kind, chain, address);
alter table watchlist enable row level security;
create policy "eigen watchlist lezen" on watchlist for select to authenticated using (user_id = auth.uid());

-- Welke gebruiker heeft welk event al als DM/e-mail gehad (dedupe)
create table user_alerts (
  user_id     uuid not null references profiles (id) on delete cascade,
  event_id    uuid not null references events (id) on delete cascade,
  channel     text not null, -- telegram | email
  sent_at     timestamptz not null default now(),
  primary key (user_id, event_id, channel)
);
alter table user_alerts enable row level security;

-- ---------------------------------------------------------------------------
-- Abonnementen (Stripe is de bron; dit is een kopie via webhooks)
-- ---------------------------------------------------------------------------
create table subscriptions (
  id                    text primary key, -- Stripe subscription id
  user_id               uuid not null references profiles (id) on delete cascade,
  status                text not null,
  price_id              text,
  interval              text,           -- month | year
  amount_cents          integer,
  currency              text,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  pro_group_member      boolean not null default false,
  updated_at            timestamptz not null default now()
);
create index subscriptions_user_idx on subscriptions (user_id);
alter table subscriptions enable row level security;
create policy "eigen abonnement lezen" on subscriptions for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- AI: cache (tokenpagina, max 1x per uur) en gebruik/kosten (admin)
-- ---------------------------------------------------------------------------
create table ai_cache (
  key         text primary key,
  content     jsonb not null,
  created_at  timestamptz not null default now()
);
alter table ai_cache enable row level security;

create table ai_usage (
  id             bigint generated always as identity primary key,
  provider       text not null,
  model          text not null,
  source         text not null,  -- telegram | web | token_page | screenshot
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  cost_usd       numeric(12, 6) not null default 0,
  created_at     timestamptz not null default now()
);
create index ai_usage_created_idx on ai_usage (created_at desc);
alter table ai_usage enable row level security;

-- Analyses vanaf de website (rate limit per gebruiker)
create table web_analyse_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles (id) on delete cascade,
  query       text not null,
  created_at  timestamptz not null default now()
);
create index web_analyse_log_idx on web_analyse_log (user_id, created_at desc);
alter table web_analyse_log enable row level security;

-- Publiek (gratis) Telegram-kanaal: vertraagd doorposten
alter table events add column public_posted boolean not null default false;
create index events_public_queue_idx on events (created_at)
  where alerted and not public_posted;

-- ---------------------------------------------------------------------------
-- Publieke views. 15 minuten vertraagd: de anon key staat in de browser, dus
-- de vertraging moet in de database zitten, anders omzeil je hem met curl.
-- Pro-gebruikers krijgen realtime data via de server (service role).
-- ---------------------------------------------------------------------------
create or replace view public_events as
  select
    e.id, e.chain, e.tx_hash, e.type, e.token_address, e.token_symbol,
    e.amount, e.usd_value, e.counterparty, e.created_at,
    coalesce(w.address, e.wallet_address) as wallet_address,
    w.label as wallet_label,
    w.type  as wallet_type,
    e.quote_token_symbol, e.quote_amount, e.block_time
  from events e
  left join wallets w on w.id = e.wallet_id
  where e.filter_reason is null
    and e.created_at < now() - interval '15 minutes'
  order by e.created_at desc;

create view public_wallet_stats as
  select
    w.id, w.chain, w.address, w.label, w.type,
    coalesce(sum(e.usd_value) filter (where e.created_at > now() - interval '30 days'), 0) as volume_30d,
    count(e.id) filter (where e.created_at > now() - interval '30 days') as trades_30d,
    count(e.id) filter (where e.type in ('swap_buy', 'swap_sell') and e.created_at > now() - interval '30 days') as swaps_30d,
    max(e.created_at) as last_activity
  from wallets w
  left join events e
    on e.wallet_id = w.id
   and e.filter_reason is null
   and e.created_at < now() - interval '15 minutes'
  where w.active and w.type <> 'exchange'
  group by w.id;

create view public_stats as
  select
    (select count(*) from wallets where active and type <> 'exchange') as tracked_wallets,
    (select coalesce(sum(usd_value), 0) from events
      where filter_reason is null and created_at > now() - interval '24 hours') as volume_24h,
    (select count(*) from events
      where filter_reason is null and created_at > now() - interval '24 hours') as alerts_24h;

grant select on public_events, public_wallet_stats, public_stats to anon, authenticated;
