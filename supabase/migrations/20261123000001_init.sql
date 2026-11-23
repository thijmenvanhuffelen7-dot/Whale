-- Fase 1: basisschema voor de Whale Alert bot + website.
-- Schrijven gebeurt ALLEEN server-side met de service role (die RLS omzeilt).
-- De website (anon/authenticated) leest alleen via de publieke views onderaan.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type chain as enum ('eth', 'sol');
create type wallet_type as enum ('smart_money', 'whale', 'exchange');
create type event_type as enum (
  'transfer',
  'swap_buy',
  'swap_sell',
  'exchange_deposit',
  'exchange_withdrawal'
);

-- ---------------------------------------------------------------------------
-- wallets: gevolgde wallets + exchange-labels (type = 'exchange')
-- ---------------------------------------------------------------------------
create table wallets (
  id          uuid primary key default gen_random_uuid(),
  chain       chain not null,
  address     text not null,
  label       text not null,
  type        wallet_type not null default 'whale',
  -- Voor exchange-wallets: naam van de exchange (Binance, Coinbase, ...)
  entity      text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
-- ETH-adressen zijn case-insensitive; we slaan ze lowercase op (zie app-code).
-- SOL-adressen (base58) zijn case-sensitive en blijven zoals ze zijn.
create unique index wallets_chain_address_key on wallets (chain, address);
create index wallets_type_idx on wallets (type) where active;

-- ---------------------------------------------------------------------------
-- tokens_watch: tokens die we volgen met een eigen drempel
-- ---------------------------------------------------------------------------
create table tokens_watch (
  id             uuid primary key default gen_random_uuid(),
  chain          chain not null,
  address        text not null,
  symbol         text not null,
  min_usd_alert  numeric(20, 2) not null default 250000,
  created_at     timestamptz not null default now(),
  unique (chain, address)
);

-- ---------------------------------------------------------------------------
-- events: alle on-chain events die we binnenkrijgen
-- ---------------------------------------------------------------------------
create table events (
  id             uuid primary key default gen_random_uuid(),
  chain          chain not null,
  tx_hash        text not null,
  -- Eén tx kan meerdere relevante legs hebben (bv. swap in + uit);
  -- log_index maakt de dedupe-sleutel uniek per leg. Default 0.
  log_index      integer not null default 0,
  wallet_id      uuid references wallets (id) on delete set null,
  type           event_type not null,
  token_address  text,
  token_symbol   text,
  amount         numeric(78, 18),
  usd_value      numeric(20, 2),
  counterparty   text,
  raw            jsonb,
  alerted        boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (chain, tx_hash, log_index)
);
create index events_created_at_idx on events (created_at desc);
create index events_wallet_idx on events (wallet_id, created_at desc);
create index events_unalerted_idx on events (created_at) where not alerted;
create index events_token_idx on events (chain, token_address, created_at desc);

-- ---------------------------------------------------------------------------
-- settings: key/value (drempels, chat_id, topic-ids, paused, ...)
-- ---------------------------------------------------------------------------
create table settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

insert into settings (key, value) values
  ('alert_threshold_usd', '250000'),
  ('analyse_daily_limit', '5'),
  ('alerts_paused', 'false'),
  ('chat_id', 'null'),
  ('topic_eth', 'null'),
  ('topic_sol', 'null'),
  ('topic_digest', 'null')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- analyse_log: voor rate limits op /analyse
-- ---------------------------------------------------------------------------
create table analyse_log (
  id                bigint generated always as identity primary key,
  telegram_user_id  bigint not null,
  query             text not null,
  created_at        timestamptz not null default now()
);
create index analyse_log_user_day_idx on analyse_log (telegram_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: alles dicht. Service role omzeilt RLS; anon/authenticated krijgen
-- geen policies op de basistabellen en kunnen dus niets lezen of schrijven.
-- ---------------------------------------------------------------------------
alter table wallets      enable row level security;
alter table tokens_watch enable row level security;
alter table events       enable row level security;
alter table settings     enable row level security;
alter table analyse_log  enable row level security;

revoke all on wallets, tokens_watch, events, settings, analyse_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Publieke views (alleen lezen). Geen raw jsonb, geen interne velden.
-- security_invoker = false (default): de view draait als eigenaar, zodat anon
-- de gefilterde kolommen kan lezen zonder toegang tot de basistabel.
-- ---------------------------------------------------------------------------
create view public_events as
  select
    e.id,
    e.chain,
    e.tx_hash,
    e.type,
    e.token_address,
    e.token_symbol,
    e.amount,
    e.usd_value,
    e.counterparty,
    e.created_at,
    w.address as wallet_address,
    w.label   as wallet_label,
    w.type    as wallet_type
  from events e
  left join wallets w on w.id = e.wallet_id
  order by e.created_at desc;

create view public_wallets as
  select id, chain, address, label, type, entity, created_at
  from wallets
  where active and type <> 'exchange';

grant select on public_events, public_wallets to anon, authenticated;
