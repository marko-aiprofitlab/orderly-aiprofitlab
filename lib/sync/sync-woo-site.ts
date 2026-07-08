import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  linkOrderCustomer,
  loadProductCosts,
  recomputeCustomerAggregates,
  upsertCustomerIdentity,
  upsertWooOrder,
} from "./db";
import { normalizeWooOrder } from "./normalize-woo-order";
import { fetchWooOrdersPage } from "./woo-client";

/**
 * Orkestrator masovnog WooCommerce backfill-a (Korak 1.4).
 *
 * Povlači istorijske porudžbine preko Woo REST-a i upisuje ih kroz isti ingest
 * sloj kao webhook (1.3), ali idempotentno i efikasno:
 *   - COGS mapa se učita JEDNOM (webhook `ingestWooOrder` je učita po porudžbini).
 *   - kupci se upisuju BEZ inkrementa agregata; tačan iznos daje finalni recompute.
 *   - obrađuje ograničen broj strana po pozivu (`pageCap`) i vraća kursor
 *     (`nextPage`) — pozivalac (ruta/klijent) petlja dok `done`, čime se ostaje
 *     ispod Vercel Hobby `maxDuration=60` (pravilo #16).
 */

type AdminClient = ReturnType<typeof createAdminClient>;

/** Podskup `sites` kolona koje backfill čita. */
export interface SiteForSync {
  id: string;
  url: string;
  consumer_key: string;
  consumer_secret: string;
  default_margin_percent: number;
}

export interface SyncWooOptions {
  /** Prva strana za obradu (1-indeksirano). Default 1. */
  startPage?: number;
  /** Maks. broj strana po pozivu (bounded za timeout). Default 5. */
  pageCap?: number;
  /** Porudžbina po strani (Woo max 100). Default 100. */
  perPage?: number;
  /** ISO datum — povuci samo porudžbine posle njega (opciono suženje obima). */
  after?: string | null;
}

export interface SyncWooResult {
  /** Broj porudžbina upisanih u OVOM pozivu. */
  processed: number;
  /** Poslednja obrađena strana. */
  lastPage: number;
  /** Ukupan broj strana (iz Woo `X-WP-TotalPages`). */
  totalPages: number;
  /** Ukupan broj porudžbina (iz Woo `X-WP-Total`). */
  total: number;
  /** true kad je obrađena poslednja strana. */
  done: boolean;
  /** Sledeća strana za nastavak, ili null ako `done`. */
  nextPage: number | null;
}

/** Kratak predah između strana — WP host throttle (WP Engine/Kinsta i sl.). */
const PAGE_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncWooSite(
  admin: AdminClient,
  site: SiteForSync,
  opts: SyncWooOptions = {},
): Promise<SyncWooResult> {
  const startPage = Math.max(1, opts.startPage ?? 1);
  const pageCap = Math.max(1, opts.pageCap ?? 5);
  const perPage = opts.perPage ?? 100;
  const after = opts.after ?? null;

  // C: COGS mapa jednom za ceo sync (ne po porudžbini).
  const productsBySku = await loadProductCosts(admin, site.id);
  const siteForIngest = {
    id: site.id,
    default_margin_percent: Number(site.default_margin_percent),
  };
  const cfg = {
    url: site.url,
    consumerKey: site.consumer_key,
    consumerSecret: site.consumer_secret,
  };

  let processed = 0;
  let totalPages = startPage; // dok prvi fetch ne javi pravu vrednost
  let total = 0;
  let lastPage = startPage - 1;

  const endPage = startPage + pageCap - 1;
  for (let page = startPage; page <= endPage; page++) {
    const result = await fetchWooOrdersPage(cfg, {
      page,
      perPage,
      after,
      order: "asc",
    });
    totalPages = result.totalPages;
    total = result.total;
    lastPage = page;

    for (const raw of result.orders) {
      if (!raw?.id) continue; // preskoči nevalidne (bez id-a)
      const normalized = normalizeWooOrder(raw, siteForIngest, productsBySku);
      const orderId = await upsertWooOrder(admin, normalized);

      if (normalized.customer) {
        const customerId = await upsertCustomerIdentity(admin, {
          email: normalized.customer.email,
          name: normalized.customer.name,
          first_name: normalized.customer.first_name,
          last_name: normalized.customer.last_name,
        });
        if (customerId) {
          await linkOrderCustomer(admin, orderId, customerId);
        }
      }
      processed++;
    }

    // Stigli smo do poslednje strane → prekini ranije.
    if (page >= totalPages) break;
    await sleep(PAGE_DELAY_MS);
  }

  const done = lastPage >= totalPages;

  // A: konačni, idempotentni recompute agregata — samo kad je backfill gotov.
  if (done) {
    await recomputeCustomerAggregates(admin);
  }

  return {
    processed,
    lastPage,
    totalPages,
    total,
    done,
    nextPage: done ? null : lastPage + 1,
  };
}
