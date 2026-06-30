-- ============================================================================
-- Orderly — 001_initial_schema.sql
-- Korak 0.4: inicijalna šema baze (9 tabela + RLS + indeksi + updated_at trigger)
--
-- Aplicira se ručno preko Supabase Dashboard → SQL Editor → Run.
-- Idempotentno gde je moguće (IF NOT EXISTS), pa je bezbedno re-run.
--
-- Konvencije:
--   - PK: uuid DEFAULT gen_random_uuid()  (pgcrypto)
--   - novac: numeric(12,2) · procenti: numeric(6,2)
--   - created_at/updated_at: timestamptz DEFAULT now()
--
-- ZLATNA PRAVILA u igri ovde:
--   #5  orders.created_at = ORIGINALNI datum sa izvora, nikad NOW()
--   #18 customers.email UNIQUE — cross-platform dedup po email-u
--   anon_read_orders policy + Realtime publikacija NISU ovde — idu u korak 1.6
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- updated_at trigger funkcija (deli je više tabela)
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. sites — prodajni kanali
-- ============================================================================
create table if not exists public.sites (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  platform                text not null check (platform in ('woocommerce', 'thinkific')),
  url                     text,
  consumer_key            text,
  consumer_secret         text,
  api_key                 text,          -- Thinkific API ključ
  webhook_secret          text,
  color_hex               text not null default '#1B6EF3',
  project_type            text,
  default_margin_percent  numeric(6,2) not null default 70,
  base_currency           text not null default 'EUR',
  active                  boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ============================================================================
-- 2. customers — kupci (cross-platform dedup po email-u, pravilo #18)
-- ============================================================================
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  name            text,
  first_name      text,
  last_name       text,
  total_spent     numeric(12,2) not null default 0,
  order_count     integer not null default 0,
  first_order_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================================
-- 7. settings — generički KV store (definisan rano, nema FK zavisnosti)
--    Ovde žive: base_currency, exchange_rates, goal_daily_global, tv_rotation_interval
-- ============================================================================
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- 3. orders — porudžbine (jezgro)
--    UNIQUE(site_id, woo_order_id) → idempotentan upsert (pravila #5/#6)
--    created_at = ORIGINALNI datum izvora (date_created), NIKAD NOW()
-- ============================================================================
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references public.sites(id) on delete cascade,
  woo_order_id    text not null,        -- eksterni ID porudžbine (Woo i Thinkific)
  number          text,                 -- display broj porudžbine
  source          text not null check (source in ('woocommerce', 'thinkific')),
  status          text,
  customer_email  text,
  customer_name   text,
  customer_id     uuid references public.customers(id) on delete set null,
  currency        text,
  total           numeric(12,2) not null default 0,
  subtotal        numeric(12,2),
  net_profit      numeric(12,2),
  payment_method  text,
  created_at      timestamptz not null,   -- originalni datum sa izvora (pravilo #5)
  updated_at      timestamptz not null default now(),
  unique (site_id, woo_order_id)
);

-- ============================================================================
-- 5. products — katalog + COGS
-- ============================================================================
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid references public.sites(id) on delete cascade,
  sku           text,
  name          text,
  product_type  text check (product_type in ('digital', 'physical')),
  cost_percent  numeric(6,2),
  cost_fixed    numeric(12,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (site_id, sku)
);

-- ============================================================================
-- 4. order_items — stavke porudžbine
-- ============================================================================
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    text,                  -- eksterni ID proizvoda
  sku           text,
  name          text,
  quantity      integer not null default 1,
  price         numeric(12,2),
  total         numeric(12,2),
  product_type  text check (product_type in ('digital', 'physical')),
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- 6. subscriptions — pretplate
-- ============================================================================
create table if not exists public.subscriptions (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid references public.sites(id) on delete cascade,
  external_id      text,
  customer_email   text,
  customer_id      uuid references public.customers(id) on delete set null,
  status           text check (status in ('active', 'paused', 'cancelled', 'trial')),
  amount           numeric(12,2),
  currency         text,
  interval         text check (interval in ('month', 'year')),
  mrr              numeric(12,2),
  started_at       timestamptz,
  next_payment_at  timestamptz,
  cancelled_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (site_id, external_id)
);

-- ============================================================================
-- 8. sync_log — log sinkova
-- ============================================================================
create table if not exists public.sync_log (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid references public.sites(id) on delete cascade,
  sync_type      text,                 -- webhook | manual | cron
  status         text,                 -- success | error
  orders_synced  integer not null default 0,
  message        text,
  created_at     timestamptz not null default now()
);

-- ============================================================================
-- 9. sound_settings — zvuk po sajtu
-- ============================================================================
create table if not exists public.sound_settings (
  id                uuid primary key default gen_random_uuid(),
  site_id           uuid references public.sites(id) on delete cascade,
  enabled           boolean not null default true,
  volume            numeric(4,2) not null default 0.7,
  sound_url         text,
  trigger_statuses  text[] not null default '{completed,processing}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (site_id)
);

-- ============================================================================
-- Indeksi
-- ============================================================================
create index if not exists idx_orders_site_id        on public.orders (site_id);
create index if not exists idx_orders_created_at      on public.orders (created_at desc);
create index if not exists idx_orders_status          on public.orders (status);
create index if not exists idx_orders_customer_email  on public.orders (customer_email);

create index if not exists idx_order_items_order_id   on public.order_items (order_id);

create index if not exists idx_customers_email        on public.customers (email);

create index if not exists idx_subscriptions_site_id  on public.subscriptions (site_id);
create index if not exists idx_subscriptions_status   on public.subscriptions (status);

create index if not exists idx_sync_log_site_id       on public.sync_log (site_id);
create index if not exists idx_sync_log_created_at    on public.sync_log (created_at desc);

create index if not exists idx_products_site_id       on public.products (site_id);

-- ============================================================================
-- updated_at trigeri (sve tabele koje imaju updated_at)
-- ============================================================================
drop trigger if exists set_updated_at on public.sites;
create trigger set_updated_at before update on public.sites
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.customers;
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.orders;
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.subscriptions;
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.settings;
create trigger set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.sound_settings;
create trigger set_updated_at before update on public.sound_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — uključi na svih 9 tabela + dve policy na svaku:
--   authenticated_read_all  → SELECT za prijavljene
--   service_role_all        → ALL za service_role (webhook/sync/admin rute)
--
-- NAPOMENA: anon_read_orders (SELECT, role anon) za Supabase Realtime
--           NIJE ovde — dodaje se u koraku 1.6 zajedno sa publikacijom.
-- ============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'sites', 'customers', 'orders', 'order_items', 'products',
    'subscriptions', 'settings', 'sync_log', 'sound_settings'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists authenticated_read_all on public.%I;', t);
    execute format(
      'create policy authenticated_read_all on public.%I for select to authenticated using (true);',
      t
    );

    execute format('drop policy if exists service_role_all on public.%I;', t);
    execute format(
      'create policy service_role_all on public.%I for all to service_role using (true) with check (true);',
      t
    );
  end loop;
end;
$$;

-- ============================================================================
-- Kraj 001_initial_schema.sql
-- ============================================================================
