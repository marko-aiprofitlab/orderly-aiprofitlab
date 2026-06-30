# Orderly

Interni **real-time order command center** — agregira porudžbine sa svih prodajnih kanala
(WooCommerce, Thinkific i druge) u jedan dashboard. Real-time WebSocket feed, multi-platform
integracija, multi-currency, zvučne notifikacije, puna analitika (revenue, profit/COGS, kupci,
pretplate, forecasting) i **TV Mode** za office wall display.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Supabase (Postgres + Realtime) · Clerk
(Organizations) · Tailwind v4 · shadcn/ui · Recharts · Resend · Vercel.

## Pokretanje (lokalno)

```bash
npm install
cp .env.example .env.local   # popuni vrednosti
npm run dev                  # http://localhost:3000
```

## Skripte

- `npm run dev` — dev server (Turbopack)
- `npm run build` — produkcioni build
- `npm run start` — pokreće produkcioni build
- `npm run lint` — ESLint

## Dokumentacija

- [`CLAUDE.md`](./CLAUDE.md) — pravila projekta, arhitektura, „Zlatna pravila" i poznate zamke.
- [`plan-implementacije.md`](./plan-implementacije.md) — plan izrade po fazama i koracima.

---

_Remati Agency · Orderly_
