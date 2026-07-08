/**
 * Domenski tipovi za ingest tok (Korak 1.2). Deljeno između webhook (1.3) i
 * backfill sync (1.4). Nema `import "server-only"` — čisti tipovi, sme i u testove.
 *
 * Napomena: `orders` i za Thinkific i za WooCommerce koristi kolonu `woo_order_id`
 * (eksterni ID izvora). `source` razlikuje platformu.
 */

/** Red spreman za upsert u `orders` (bez `id`/`customer_id` — rešava ih `db.ts`). */
export interface OrderRow {
  site_id: string;
  woo_order_id: string;
  number: string | null;
  source: "woocommerce" | "thinkific";
  status: string | null;
  customer_email: string | null;
  customer_name: string | null;
  currency: string | null;
  total: number;
  subtotal: number | null;
  net_profit: number | null;
  payment_method: string | null;
  /** ORIGINALNI datum sa izvora (ISO). Zlatno pravilo #5 — NIKAD NOW(). */
  created_at: string;
  updated_at: string;
}

/** Red za `order_items` (bez `order_id` — dodaje se pri insert-u u `db.ts`). */
export interface OrderItemRow {
  product_id: string | null;
  sku: string | null;
  name: string | null;
  quantity: number;
  price: number | null;
  total: number | null;
  product_type: "digital" | "physical";
}

/**
 * Podaci za dedup/ažuriranje kupca (dedup po email-u, Zlatno pravilo #18).
 * `amount`/`orderDate` su delta koje `upsertCustomer` primenjuje na
 * `total_spent`/`order_count`/`first_order_at`.
 */
export interface CustomerUpsert {
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  amount: number;
  orderDate: string;
}

/** Rezultat normalizacije jedne porudžbine. */
export interface NormalizedOrder {
  order: OrderRow;
  items: OrderItemRow[];
  customer: CustomerUpsert | null;
}

/** Red iz `products` potreban za COGS izračun (podskup kolona). */
export interface ProductCost {
  sku: string | null;
  cost_percent: number | null;
  cost_fixed: number | null;
}

/** Podskup `sites` kolona koje ingest čita. */
export interface SiteForIngest {
  id: string;
  default_margin_percent: number;
}

// ---------------------------------------------------------------------------
// Sirovi WooCommerce payload (labavo tipizirano — dolazi izvana, ne verujemo mu)
// ---------------------------------------------------------------------------

export interface WooDimensions {
  length?: string | null;
  width?: string | null;
  height?: string | null;
}

export interface WooLineItem {
  product_id?: number | string | null;
  variation_id?: number | string | null;
  sku?: string | null;
  name?: string | null;
  quantity?: number | null;
  price?: number | string | null;
  total?: number | string | null;
  /** Woo ne šalje uvek weight/dimensions na line_item; odsutno → tretiramo kao digital. */
  weight?: string | null;
  dimensions?: WooDimensions | null;
}

export interface WooBilling {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export interface WooOrder {
  id?: number | string | null;
  number?: string | number | null;
  status?: string | null;
  currency?: string | null;
  total?: number | string | null;
  /** Woo REST vraća string „subtotal" samo u zbiru line_items; koristimo total ako fali. */
  subtotal?: number | string | null;
  date_created?: string | null;
  date_created_gmt?: string | null;
  date_modified?: string | null;
  date_modified_gmt?: string | null;
  payment_method?: string | null;
  payment_method_title?: string | null;
  billing?: WooBilling | null;
  line_items?: WooLineItem[] | null;
}
