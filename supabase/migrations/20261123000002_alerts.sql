-- Fase 2-6: alert-pipeline, throttling, digest en exchange-labels.

-- Waarom een event NIET gemeld wordt (null = wel melden zodra het mag).
alter table events add column filter_reason text;
-- Voor swaps: wat er tegenover stond (bv. 120 SOL voor 12.4M $TOKEN).
alter table events add column quote_token_address text;
alter table events add column quote_token_symbol text;
alter table events add column quote_amount numeric(78, 18);
-- Adres van de gevolgde wallet (ook voor token-watch events zonder wallet_id).
alter table events add column wallet_address text;
-- Tijdstip van de transactie on-chain (created_at = moment van binnenkomst).
alter table events add column block_time timestamptz;

create index events_pending_idx on events (created_at)
  where not alerted and filter_reason is null;

-- Throttle: laatste alert per wallet.
alter table wallets add column last_alert_at timestamptz;

-- Alerts zonder bekende wallet (token-watch) throttlen we op adres.
create table alert_throttle (
  chain          chain not null,
  address        text not null,
  last_alert_at  timestamptz not null,
  primary key (chain, address)
);
alter table alert_throttle enable row level security;
revoke all on alert_throttle from anon, authenticated;

/**
 * Atomaire throttle-claim: geeft true terug als deze aanroep de wallet mag
 * melden (laatste alert > p_interval geleden) en zet meteen de nieuwe tijd.
 * Twee gelijktijdige webhooks kunnen zo nooit allebei dezelfde wallet melden.
 */
create or replace function claim_alert_slot(
  p_chain chain,
  p_address text,
  p_interval interval
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  insert into alert_throttle as t (chain, address, last_alert_at)
  values (p_chain, p_address, now())
  on conflict (chain, address) do update
    set last_alert_at = now()
    where t.last_alert_at < now() - p_interval
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

/** Geef een claim terug als het versturen mislukte, zodat de volgende poging niet 2 min hoeft te wachten. */
create or replace function release_alert_slot(p_chain chain, p_address text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from alert_throttle where chain = p_chain and address = p_address;
$$;

revoke all on function claim_alert_slot(chain, text, interval) from public, anon, authenticated;
revoke all on function release_alert_slot(chain, text) from public, anon, authenticated;

-- Mislukte webhooks (voor het admin-dashboard en debugging).
create table webhook_failures (
  id          bigint generated always as identity primary key,
  source      text not null,          -- helius | alchemy | telegram | stripe
  error       text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index webhook_failures_created_idx on webhook_failures (created_at desc);
alter table webhook_failures enable row level security;
revoke all on webhook_failures from anon, authenticated;

-- Extra settings
insert into settings (key, value) values
  ('swap_threshold_usd', '10000'),
  ('min_liquidity_usd', '10000'),
  ('throttle_seconds', '120'),
  ('last_digest_date', 'null')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Startlijst exchange-wallets. CONTROLEER en vul aan (bv. via Arkham/Etherscan
-- labels). ETH-adressen lowercase. Een exchange heeft vaak tientallen wallets;
-- dit zijn alleen een paar bekende hot wallets.
-- ---------------------------------------------------------------------------
insert into wallets (chain, address, label, type, entity) values
  ('eth', '0x28c6c06298d514db089934071355e5743bf21d60', 'Binance 14', 'exchange', 'Binance'),
  ('eth', '0x21a31ee1afc51d94c2efccaa2092ad1028285549', 'Binance 15', 'exchange', 'Binance'),
  ('eth', '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', 'Binance 16', 'exchange', 'Binance'),
  ('eth', '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8', 'Binance 7', 'exchange', 'Binance'),
  ('eth', '0x71660c4005ba85c37ccec55d0c4493e66fe775d3', 'Coinbase 1', 'exchange', 'Coinbase'),
  ('eth', '0x503828976d22510aad0201ac7ec88293211d23da', 'Coinbase 2', 'exchange', 'Coinbase'),
  ('eth', '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740', 'Coinbase 3', 'exchange', 'Coinbase'),
  ('eth', '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', 'Coinbase 10', 'exchange', 'Coinbase'),
  ('eth', '0x2910543af39aba0cd09dbb2d50200b3e800a63d2', 'Kraken 1', 'exchange', 'Kraken'),
  ('eth', '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0', 'Kraken 4', 'exchange', 'Kraken'),
  ('eth', '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', 'OKX', 'exchange', 'OKX'),
  ('eth', '0xf89d7b9c864f589bbf53a82105107622b35eaa40', 'Bybit', 'exchange', 'Bybit'),
  ('sol', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'Binance', 'exchange', 'Binance'),
  ('sol', 'H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS', 'Coinbase 1', 'exchange', 'Coinbase'),
  ('sol', 'FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5', 'Kraken', 'exchange', 'Kraken'),
  ('sol', '5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD', 'OKX', 'exchange', 'OKX'),
  ('sol', 'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2', 'Bybit', 'exchange', 'Bybit')
on conflict (chain, address) do nothing;

-- Publieke view: block_time + quote erbij, filtered events niet tonen.
create or replace view public_events as
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
    coalesce(w.address, e.wallet_address) as wallet_address,
    w.label   as wallet_label,
    w.type    as wallet_type,
    e.quote_token_symbol,
    e.quote_amount,
    e.block_time
  from events e
  left join wallets w on w.id = e.wallet_id
  where e.filter_reason is null
  order by e.created_at desc;
