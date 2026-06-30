# CLAUDE.md — Orderly

> Pročitaj ovaj fajl pre svakog rada na projektu. Sadrži pravila, arhitekturu i poznate zamke koje su nas već koštale vremena. Ne ponavljaj greške iz sekcije „Zlatna pravila".

---

## Šta je Orderly

Orderly je **interni real-time order command center** — agregira porudžbine sa svih prodajnih kanala (WooCommerce, Thinkific i druge) u jedan dashboard. Prikazuje se na TV-u u kancelariji, dostupan celom timu, ima zvučne notifikacije za nove porudžbine, multi-currency podršku i punu analitiku (revenue, profit/COGS, kupci, pretplate, forecasting).

Tri stvari ga izdvajaju od gotovih alata (npr. Metorik): **real-time WebSocket feed**, **multi-platform integracija** u istom dashboardu i **TV Mode** za office wall display.

**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript · Supabase (Postgres + Realtime, region Frankfurt) · Clerk (Organizations) · Tailwind v4 · shadcn/ui · Recharts · Resend · Vercel (hosting + cron).

---

## ⚠️ Zlatna pravila (NIKAD / UVEK)

Ovo su greške koje su nas konkretno koštale vremena. Drži ih se bez izuzetka.

1. **Next.js 16 ima breaking changes.** Pre pisanja koda koji dodiruje routing, middleware, server komponente ili konvencije — pročitaj relevantan vodič iz `node_modules/next/dist/docs/`. Ne oslanjaj se na znanje iz starijih verzija.
2. **Middleware se zove `proxy.ts`** (ne `middleware.ts`) u Next.js 16.
3. **Supabase browser klijent MORA biti singleton** (modul-level eksport). Ako pozoveš `createBrowserClient()` unutar komponente/hooka, dobijaš novi Realtime kanal na svaki render → `CLOSED → SUBSCRIBED` petlja.
4. **Service role ključ samo na serveru.** `SUPABASE_SERVICE_ROLE_KEY` se koristi isključivo u webhook/sync/admin rutama — nikad u frontend kodu.
5. **`created_at` na `orders` je originalni datum sa izvora**, NIKAD `NOW()`. Uvek `created_at: order.date_created`. (Bug koji je „spljoštio" sve grafike — stare porudžbine su dobijale današnji datum.)
6. **Webhook rute UVEK vraćaju `200`** — čak i na grešci — da WooCommerce ne gomila retry-jeve.
7. **Webhook se NE testira lokalno.** WooCommerce/Thinkific ne mogu do `localhost` → koristi produkcioni Vercel URL (ili tunel).
8. **Webhook i `/tv` rute MORAJU biti javne** u `proxy.ts`. Ako ih Clerk štiti, izvori dobijaju `401` i porudžbine se ne upisuju.
9. **Realtime zahteva `anon` RLS policy.** Supabase Realtime šalje event-e u browser preko `anon` role (i za prijavljene korisnike). Bez `anon_read_orders` (SELECT, `anon`, USING true) na `orders` — event-i ne stižu.
10. **Page Visibility refetch je obavezan.** Browser throttle-uje WebSocket kad tab nije fokusiran → feed „zamrzne" (kritično za TV). Refetch današnjih porudžbina na fokus taba + reconnect/heartbeat (30s).
11. **Geist font:** Tailwind v4 nema config — font ide u `globals.css` `@theme` kao `"Geist"`. Na `<body>` koristi `geist.className`, **ne** `geist.variable`.
12. **`useSearchParams` mora biti u `<Suspense>`** (npr. FilterBar) — inače build puca.
13. **AOV se računa deljenjem SUMOM prihoda, ne brojem porudžbina.**
14. **Live feed bez `sessionStorage`** — pravi „duhove" starih porudžbina. Uvek fetch sveže za današnji dan na mount.
15. **Web Audio se otključava prvom interakcijom** (`unlockAudio()` na prvi klik) — autoplay politika browsera.
16. **Vercel Hobby = samo dnevni cron.** Nema intra-dnevnog sync-a u `vercel.json`; real-time ide preko webhook-ova, sync je ručni + dnevni cron.
17. **Sign-in mora biti catch-all:** `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, sa `/sign-in(.*)` u public rutama.
18. **Kupci se dedupliciraju cross-platform po email-u** (`customers.email` UNIQUE). Isti čovek na WooCommerce-u i Thinkific-u = jedan kupac.

---

## Arhitektura i struktura foldera

```
app/
  (auth)/sign-in/[[...sign-in]]/page.tsx   # catch-all
  (dashboard)/
    layout.tsx                             # sidebar (220px) + header + providers
    dashboard/page.tsx                     # KPI + live feed + tabela
    dashboard/[siteId]/page.tsx            # per-site dashboard
    analytics/page.tsx
    customers/page.tsx · customers/[id]/page.tsx
    subscriptions/page.tsx
    profit/page.tsx
    settings/general · settings/sites · settings/sound
  tv/page.tsx + tv/tv-content.tsx          # JAVNA, full-screen, bez auth
  api/...                                  # vidi „Mapa ruta"
components/
  dashboard/                               # kpi-card, live-feed, orders-table, filter-bar, charts/...
  ui/                                      # shadcn komponente
lib/
  supabase/{browser-client,server,admin}.ts
  sync/{normalize-woo-order,db,sync-woo-site,sync-thinkific-site}.ts
  hooks/{use-realtime-orders,use-kpi-stats,use-sparklines,use-sound-notification}.ts
  contexts/{realtime-orders-context,sound-context}.ts
  utils/{fx,currency}.ts
supabase/migrations/
proxy.ts                                   # Clerk middleware (Next.js 16 ime!)
vercel.json                               # samo dnevni/nedeljni/mesečni digest cron
```

### Supabase klijenti — tri konteksta (bez ORM-a, direktan Supabase JS)
- `lib/supabase/browser-client.ts` — **singleton** `createBrowserClient` (modul-level). Za client komponente/hooke.
- `lib/supabase/server.ts` — `createServerClient` sa `cookies()` iz `next/headers`. Za server komponente i akcije.
- `lib/supabase/admin.ts` — `createClient` sa `SUPABASE_SERVICE_ROLE_KEY`. Samo za webhook/sync rute.

### Ingest tok (jedan izvor istine)
Webhook i sync **oba** koriste `lib/sync/normalize-*-order.ts` → `lib/sync/db.ts`:
- `normalizeWooOrder` → mapira u `orderRow` + `itemRows`; detekcija `digital`/`physical` (digital = bez težine/dimenzija); izračun `net_profit` na ulazu (po `products.cost_percent`/`cost_fixed`, fallback `site.default_margin_percent`, minus ~5% za kartice/`stripe`).
- `upsertWooOrder` — idempotentno po `UNIQUE(site_id, woo_order_id)`.
- `upsertCustomer` — dedup po email-u, ažurira `total_spent`/`order_count`.
- `logSync` — upis u `sync_log`.

### Real-time jezgro
- Jedan WebSocket kanal montiran na nivou `(dashboard)/layout.tsx` kroz `RealtimeOrdersProvider`.
- `use-realtime-orders.ts`: pretplata na INSERT/UPDATE, reconnect, heartbeat 30s, Page Visibility refetch, enrich iz cache-a sajtova, limit 50.
- Kontekst radi SWR `mutate` za KPI + debounce `router.refresh()`; `subscribeToNewOrders` za page-level callback-ove (animacija feed-a, zvuk).

---

## Baza — šema (9 tabela)

`sites` · `customers` · `orders` · `order_items` · `products` · `subscriptions` · `settings` (KV) · `sync_log` · `sound_settings`

**RLS:** uključen na svim tabelama. Policy na svakoj: `authenticated_read_all` (SELECT) + `service_role_all` (ALL). **Dodatno na `orders`:** `anon_read_orders` (SELECT, role `anon`, USING true) za Realtime.

**Ključne kolone / pravila:**
- `orders`: `UNIQUE(site_id, woo_order_id)` (idempotentni upsert); `created_at` = originalni datum izvora; indeksi na `site_id`, `created_at DESC`, `status`, `customer_email`.
- `order_items`: indeks na `order_id`.
- `customers`: `email` UNIQUE (cross-platform dedup); indeks na `email`.
- `sites`: `platform` CHECK kolona (`woocommerce`/`thinkific`/...) — nova platforma = nova vrednost u CHECK-u + nova `sync`/`webhook` ruta po istom obrascu.
- `settings`: generički KV (`key` UNIQUE, `value` JSONB). Ovde žive `base_currency`, `exchange_rates`, `goal_daily_global`, `tv_rotation_interval`.

---

## Auth (Clerk)
- `ClerkProvider` u root `layout.tsx`. **Organizations** uključene; role: `admin` / `manager` / `viewer`.
- `proxy.ts`: `clerkMiddleware` + `createRouteMatcher`. Public: `/sign-in(.*)`, `/sign-up(.*)`, `/tv(.*)`, `/api/webhook/woo/(.*)`, `/api/webhook/thinkific/(.*)`. Sve ostalo `auth.protect()`.
- Svaka zaštićena API ruta proverava Clerk sesiju + role.

---

## Dizajn sistem (tokeni u `globals.css` `:root`)

**Boje:** accent `#1B6EF3`, accent-hover `#1558CC`, accent-bg `#EBF2FF`, success `#16A34A`, warning `#D97706`, danger `#DC2626`, neutral `#6366F1` (svaka ima `-bg` svetlu varijantu). + shadcn oklch tokeni za light i `.dark`.

**Tipografija (Geist):** KPI brojevi 28–32px/700 (ls −0.03em); H1 24px/700 (−0.02em); naslov kartice 13px/600; body 13px/400; labels uppercase 11px/500 (+0.04em).

**Senke:** `--shadow-sm` (kartica) · `--shadow-md` (hover) · `--shadow-lg`.

**Animacije:** `--transition` 180ms `cubic-bezier(0.4,0,0.2,1)`; `--transition-spring` 300ms `cubic-bezier(0.34,1.56,0.64,1)` (progress/goal). Hover kartica `translateY(-1px)` + shadow-md; klik dugme `scale(0.98)`; nova porudžbina slide-down + fade-in + accent flash. TV: `tv-fade-in`, `tv-marquee`, `tv-row-in`.

**Tailwind v4:** sva konfiguracija u `globals.css` (`@theme` blok), **nema** `tailwind.config.ts`. shadcn: style `base-nova`, baseColor neutral, ikone lucide.

---

## Mapa ruta (referenca)

**Stranice** (zaštićene osim `/tv`):
`/dashboard` · `/dashboard/[siteId]` · `/analytics` · `/customers` · `/customers/[id]` · `/subscriptions` · `/profit` · `/settings/general` · `/settings/sites` · `/settings/sound` · `/tv` (javna)

**API:**
`/api/stats/kpi` · `/api/stats/sparklines` · `/api/kpi` · `/api/kpi-products` · `/api/analytics/{daily-revenue,status-breakdown,top-products,forecast,cohort}` · `/api/customers` · `/api/customers/[id]` · `/api/profit/{kpi,products,recalculate}` · `/api/subscriptions` · `/api/settings` · `/api/sites` · `/api/sites/[id]` · `/api/sound-settings` · `/api/sound-settings/upload` · `/api/sync/{all,woo/[siteId],thinkific/[siteId]}` · `/api/webhook/{woo/[siteId],thinkific/[siteId]}` (javne) · `/api/digest/{daily,weekly,monthly}` (cron)

---

## Status faza (definicija gotovog)

- **Faza 0 — Postavka:** app se deplojuje, login radi, baza (9 tabela + RLS + indeksi), Supabase/Clerk povezani, sidebar navigacija postoji.
- **Faza 1 — MVP:** porudžbine sa WooCommerce + Thinkific ulaze (webhook + sync), žive na real-time dashboardu sa 5 KPI-jeva, live feed, tabela sa filterima, multi-currency, zvuk.
- **Faza 2 — Analitika:** grafici, per-site dashboard, profit/COGS, kupci, pretplate, forecasting, cohort, goal tracker, TV Mode, email digest; produkciono ispolirano.

> **Ažuriraj ovde** koji je korak trenutno gotov / u radu kako projekat napreduje.

---

## Env varijable
`NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` · Clerk publishable/secret + sign-in URL-ovi · `CRON_SECRET` · `RESEND_API_KEY` (Faza 2).

---

## Stil komunikacije i koda
- Odgovaraj na **srpskom** (latinica) sa engleskim tehničkim terminima gde je prirodno.
- TypeScript, App Router konvencije, server komponente kao default; `"use client"` samo gde treba (hooke, interaktivnost).
- Jedan korak iz plana = po mogućstvu jedan (ili više) fokusiranih Git commit-ova.
- Pre nego što kreneš sa korakom, proveri zavisnosti: 1.3/1.4 zavise od 1.1+1.2; 1.6 od 0.5+0.4; 1.7–1.9 od 1.6; multi-currency (1.10) pre Faze 2 (svi grafici/KPI konvertuju preko `fx.ts`/`currency.ts`); digest (2.11) zavisi od Resend + verifikovanog domena.