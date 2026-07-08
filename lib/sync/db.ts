import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWooOrder } from "./normalize-woo-order";
import type {
  CustomerUpsert,
  NormalizedOrder,
  ProductCost,
  SiteForIngest,
  WooOrder,
} from "./types";

/**
 * DB helperi za ingest (Korak 1.2). Sve piše preko service_role admin klijenta
 * (zaobilazi RLS — Zlatno pravilo #4). Idempotentno po UNIQUE constraint-ima:
 *   - orders   UNIQUE(site_id, woo_order_id)
 *   - customers UNIQUE(email)
 *   - products UNIQUE(site_id, sku)
 */

type AdminClient = ReturnType<typeof createAdminClient>;

/** Učita COGS mapu (`sku` → trošak) za sajt. Prazna ako sajt nema products. */
export async function loadProductCosts(
  admin: AdminClient,
  siteId: string,
): Promise<Map<string, ProductCost>> {
  const { data, error } = await admin
    .from("products")
    .select("sku, cost_percent, cost_fixed")
    .eq("site_id", siteId);

  const map = new Map<string, ProductCost>();
  if (error || !data) return map;
  for (const row of data as ProductCost[]) {
    if (row.sku) map.set(row.sku, row);
  }
  return map;
}

/**
 * Upsert porudžbine + stavki. Idempotentno: order po (site_id, woo_order_id);
 * stavke se pri update-u brišu i re-insert-uju (order_items nema UNIQUE).
 * Vraća `orderId`.
 */
export async function upsertWooOrder(
  admin: AdminClient,
  normalized: NormalizedOrder,
): Promise<string> {
  const { data, error } = await admin
    .from("orders")
    .upsert(normalized.order, { onConflict: "site_id,woo_order_id" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `upsertWooOrder: ${error?.message ?? "nema vraćenog reda"}`,
    );
  }
  const orderId = (data as { id: string }).id;

  // Zameni stavke (idempotentno — bez UNIQUE na order_items).
  const { error: delErr } = await admin
    .from("order_items")
    .delete()
    .eq("order_id", orderId);
  if (delErr) throw new Error(`upsertWooOrder(items delete): ${delErr.message}`);

  if (normalized.items.length > 0) {
    const rows = normalized.items.map((it) => ({ ...it, order_id: orderId }));
    const { error: insErr } = await admin.from("order_items").insert(rows);
    if (insErr) {
      throw new Error(`upsertWooOrder(items insert): ${insErr.message}`);
    }
  }

  return orderId;
}

/**
 * Dedup kupca po email-u (Zlatno pravilo #18). Ažurira agregate:
 *   total_spent += amount, order_count += 1, first_order_at = min(postojeći, novi).
 * Vraća `customer.id` ili null (ako nema email-a).
 *
 * Napomena: ovo NIJE potpuno atomično (read-modify-write). Za webhook (jedna
 * porudžbina u trenutku) je prihvatljivo; masovni sync obrađuje redom.
 */
export async function upsertCustomer(
  admin: AdminClient,
  customer: CustomerUpsert,
): Promise<string | null> {
  const { data: existing } = await admin
    .from("customers")
    .select("id, total_spent, order_count, first_order_at")
    .eq("email", customer.email)
    .maybeSingle();

  const prevSpent = existing ? Number(existing.total_spent) : 0;
  const prevCount = existing ? Number(existing.order_count) : 0;
  const prevFirst = existing?.first_order_at
    ? String(existing.first_order_at)
    : null;
  const firstOrderAt =
    prevFirst && prevFirst < customer.orderDate ? prevFirst : customer.orderDate;

  const row = {
    email: customer.email,
    name: customer.name,
    first_name: customer.first_name,
    last_name: customer.last_name,
    total_spent: prevSpent + customer.amount,
    order_count: prevCount + 1,
    first_order_at: firstOrderAt,
  };

  const { data, error } = await admin
    .from("customers")
    .upsert(row, { onConflict: "email" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`upsertCustomer: ${error?.message ?? "nema vraćenog reda"}`);
  }
  return (data as { id: string }).id;
}

/** Poveži porudžbinu sa kupcem (orders.customer_id). Best-effort. */
async function linkOrderCustomer(
  admin: AdminClient,
  orderId: string,
  customerId: string,
): Promise<void> {
  await admin.from("orders").update({ customer_id: customerId }).eq("id", orderId);
}

/** Upis u sync_log. Nikad ne baca (best-effort logovanje). */
export async function logSync(
  admin: AdminClient,
  entry: {
    siteId: string;
    syncType: "webhook" | "manual" | "cron";
    status: "success" | "error";
    ordersSynced?: number;
    message?: string | null;
  },
): Promise<void> {
  try {
    await admin.from("sync_log").insert({
      site_id: entry.siteId,
      sync_type: entry.syncType,
      status: entry.status,
      orders_synced: entry.ordersSynced ?? 0,
      message: entry.message ?? null,
    });
  } catch {
    // best-effort — ne rušimo ingest zbog log greške
  }
}

/**
 * Orkestrator: sirova Woo porudžbina → baza, jednim pozivom. Koriste ga i
 * webhook (1.3) i backfill sync (1.4).
 *
 * Ne loguje sam u sync_log ovde (pozivalac odlučuje sync_type i zbirni broj) —
 * baca grešku koju pozivalac hvata i loguje. Webhook UVEK vraća 200 (pravilo #6).
 */
export async function ingestWooOrder(
  admin: AdminClient,
  raw: WooOrder,
  site: SiteForIngest,
): Promise<{ orderId: string }> {
  const productsBySku = await loadProductCosts(admin, site.id);
  const normalized = normalizeWooOrder(raw, site, productsBySku);

  const orderId = await upsertWooOrder(admin, normalized);

  if (normalized.customer) {
    const customerId = await upsertCustomer(admin, normalized.customer);
    if (customerId) {
      await linkOrderCustomer(admin, orderId, customerId);
    }
  }

  return { orderId };
}
