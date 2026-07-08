-- ============================================================================
-- Orderly — 002_recompute_customers.sql
-- Korak 1.4: recompute agregata kupaca iz `orders` (idempotentan backfill).
--
-- Aplicira se ručno preko Supabase Dashboard → SQL Editor → Run. Bezbedno re-run.
--
-- PROBLEM: `upsertCustomer` (webhook, 1.3) inkrementira total_spent/order_count
-- po porudžbini. Backfill koji bi to koristio bi DUPLIRAO agregate pri re-run-u.
-- REŠENJE: backfill upisuje kupce bez inkrementa (identity-only), a na kraju
-- pozove ovu funkciju koja agregate izračuna IZNOVA iz `orders` — isti rezultat
-- bez obzira na broj pokretanja.
--
-- Agregira GLOBALNO po `customer_id` (kupci su cross-site/cross-platform, dedup
-- po email-u — pravilo #18), pa se sumiraju SVE porudžbine kupca, ne samo jednog
-- sajta. Kupci bez ijedne porudžbine se resetuju na nulu.
-- ============================================================================

create or replace function public.recompute_customer_aggregates()
returns void
language sql
security definer
set search_path = public
as $$
  update public.customers c set
    total_spent    = coalesce(agg.s, 0),
    order_count    = coalesce(agg.n, 0),
    first_order_at = agg.f,
    updated_at     = now()
  from (
    select
      customer_id,
      sum(total)      as s,
      count(*)        as n,
      min(created_at) as f
    from public.orders
    where customer_id is not null
    group by customer_id
  ) agg
  where c.id = agg.customer_id;
$$;
