import "server-only";

import type { WooOrder } from "./types";

/**
 * WooCommerce REST client za backfill (Korak 1.4) — paginirano povlačenje
 * porudžbina. Čist HTTP sloj bez DB-a (orkestrira ga `sync-woo-site.ts`).
 *
 * Woo REST: `GET {url}/wp-json/wc/v3/orders` sa Basic auth (consumer_key:secret).
 * Webhook se NE testira lokalno (pravilo #7), ali ovaj client je server→server
 * REST poziv ka pravom Woo host-u — radi i lokalno ako su credencijali validni.
 */

export interface WooClientConfig {
  /** Baza store URL-a, npr. `https://shop.com` (bez `/wp-json`). */
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface WooPage {
  orders: WooOrder[];
  /** `X-WP-TotalPages` — ukupan broj strana za dati `per_page`. */
  totalPages: number;
  /** `X-WP-Total` — ukupan broj porudžbina. */
  total: number;
}

export interface FetchOrdersOptions {
  page: number;
  perPage?: number;
  /** ISO 8601 datum — vrati samo porudžbine kreirane posle njega. */
  after?: string | null;
  order?: "asc" | "desc";
}

/** Timeout po zahtevu (ms) — da spor host ne pojede ceo `maxDuration=60` rute. */
const REQUEST_TIMEOUT_MS = 25_000;
/** Broj pokušaja na prolaznu grešku (429/5xx) pre nego što odustanemo. */
const MAX_ATTEMPTS = 3;

function backoffDelay(attempt: number): number {
  // 500ms, 1000ms, ... (attempt je 1-indeksiran)
  return 500 * 2 ** (attempt - 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dohvati jednu stranu porudžbina.
 *
 * `order=asc&orderby=date` je namerno fiksirano: stabilan redosled da paginacija
 * ne „klizi" — nove porudžbine koje stignu tokom backfill-a idu na KRAJ i ne
 * pomeraju već obrađene strane.
 *
 * Baca `Error` na trajne greške (4xx osim 429, ili iscrpljene pokušaje). Auth
 * greške (401/403) dobijaju jasnu poruku o kredencijalima.
 */
export async function fetchWooOrdersPage(
  cfg: WooClientConfig,
  opts: FetchOrdersOptions,
): Promise<WooPage> {
  const base = cfg.url.replace(/\/+$/, "");
  const params = new URLSearchParams({
    per_page: String(opts.perPage ?? 100),
    page: String(opts.page),
    order: opts.order ?? "asc",
    orderby: "date",
    status: "any",
  });
  if (opts.after) params.set("after", opts.after);

  const endpoint = `${base}/wp-json/wc/v3/orders?${params.toString()}`;
  const authHeader =
    "Basic " +
    Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString("base64");

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      // Prolazne greške → retry sa backoff-om.
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Woo API ${res.status} (strana ${opts.page}).`);
        if (attempt < MAX_ATTEMPTS) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        throw lastError;
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Woo API ${res.status}: pristup odbijen — proveri consumer_key/consumer_secret.`,
        );
      }

      if (!res.ok) {
        const body = (await res.text().catch(() => "")).slice(0, 200);
        throw new Error(`Woo API ${res.status}: ${body || "nepoznata greška"}.`);
      }

      const orders = (await res.json()) as WooOrder[];
      const totalPages = Number(res.headers.get("x-wp-totalpages") ?? "1") || 1;
      const total = Number(res.headers.get("x-wp-total") ?? "0") || 0;

      return {
        orders: Array.isArray(orders) ? orders : [],
        totalPages,
        total,
      };
    } catch (err) {
      // AbortError (timeout) tretiramo kao prolaznu grešku i retry-jemo.
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (isAbort) {
        lastError = new Error(
          `Woo API timeout (>${REQUEST_TIMEOUT_MS}ms, strana ${opts.page}).`,
        );
        if (attempt < MAX_ATTEMPTS) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        throw lastError;
      }
      // Ostale greške (uključujući naše throw-ove gore) su trajne.
      throw err instanceof Error ? err : new Error(String(err));
    } finally {
      clearTimeout(timer);
    }
  }

  // Nedostižno, ali TS traži povratnu vrednost.
  throw lastError ?? new Error("Woo API: iscrpljeni pokušaji.");
}
