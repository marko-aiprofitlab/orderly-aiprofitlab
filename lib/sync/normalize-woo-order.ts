/**
 * Normalizacija WooCommerce porudžbine → redovi baze (Korak 1.2).
 *
 * Jedan izvor istine koji koriste i webhook (1.3) i backfill sync (1.4). Čiste
 * funkcije bez I/O — `products` COGS mapa se prosleđuje spolja (učita je `db.ts`),
 * pa je normalizacija lako testabilna.
 *
 * ZLATNA PRAVILA u igri:
 *   #5  created_at = date_created sa izvora, NIKAD NOW() (inače „spljošteni" grafici)
 *   #18 kupci se dedupliciraju po email-u (email lowercase/trim)
 */
import type {
  CustomerUpsert,
  NormalizedOrder,
  OrderItemRow,
  OrderRow,
  ProductCost,
  SiteForIngest,
  WooLineItem,
  WooOrder,
} from "./types";

/** Naknada za obradu kartice (~5%) — oduzima se od profita kod kartičnih plaćanja. */
const CARD_FEE_RATE = 0.05;

/** Payment metode koje tretiramo kao kartične (Stripe i sl.) → skidamo fee. */
function isCardPayment(method: string | null): boolean {
  if (!method) return false;
  const m = method.toLowerCase();
  return (
    m.includes("stripe") ||
    m.includes("card") ||
    m === "ppcp" ||
    m.includes("credit")
  );
}

function toNumber(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") {
    if (typeof v === "number") return String(v);
    return null;
  }
  const t = v.trim();
  return t.length ? t : null;
}

/**
 * Detekcija tipa proizvoda po stavci: `physical` ako stavka nosi težinu ILI
 * bilo koju dimenziju; inače `digital`. Woo često ne šalje weight/dimensions na
 * line_item → odsutno tumačimo konzervativno kao `digital`.
 */
function detectProductType(item: WooLineItem): "digital" | "physical" {
  const hasWeight = toNumber(item.weight) > 0;
  const d = item.dimensions;
  const hasDimensions =
    !!d &&
    (toNumber(d.length) > 0 ||
      toNumber(d.width) > 0 ||
      toNumber(d.height) > 0);
  return hasWeight || hasDimensions ? "physical" : "digital";
}

/**
 * Profit po stavci na osnovu `products` COGS-a, sa fallback-om na maržu sajta.
 *
 * Semantika kolona (iz naziva — komplementarne su):
 *   - `cost_fixed`   → fiksni trošak po komadu:  profit = total − cost_fixed × qty
 *   - `cost_percent` → TROŠAK kao %:             profit = total × (1 − cost_percent/100)
 *   - fallback `default_margin_percent` → MARŽA: profit = total × margin/100
 */
function itemProfit(
  item: OrderItemRow,
  product: ProductCost | undefined,
  defaultMarginPercent: number,
): number {
  const lineTotal = item.total ?? 0;

  if (product) {
    if (product.cost_fixed !== null && product.cost_fixed !== undefined) {
      return lineTotal - product.cost_fixed * item.quantity;
    }
    if (product.cost_percent !== null && product.cost_percent !== undefined) {
      return lineTotal * (1 - product.cost_percent / 100);
    }
  }
  return lineTotal * (defaultMarginPercent / 100);
}

/**
 * Neto profit cele porudžbine: suma profita po stavci minus ~5% kartične naknade
 * (na ukupan iznos porudžbine) ako je plaćanje kartično.
 */
export function computeNetProfit(
  items: OrderItemRow[],
  productsBySku: Map<string, ProductCost>,
  site: SiteForIngest,
  paymentMethod: string | null,
  orderTotal: number,
): number {
  let profit = 0;
  for (const item of items) {
    const product = item.sku ? productsBySku.get(item.sku) : undefined;
    profit += itemProfit(item, product, site.default_margin_percent);
  }
  if (isCardPayment(paymentMethod)) {
    profit -= orderTotal * CARD_FEE_RATE;
  }
  // Zaokruži na 2 decimale (numeric(12,2) u bazi).
  return Math.round(profit * 100) / 100;
}

/**
 * Sirova WooCommerce porudžbina → `NormalizedOrder`.
 * `productsBySku` može biti prazna mapa → profit pada na `site.default_margin_percent`.
 */
export function normalizeWooOrder(
  raw: WooOrder,
  site: SiteForIngest,
  productsBySku: Map<string, ProductCost> = new Map(),
): NormalizedOrder {
  const lineItems = Array.isArray(raw.line_items) ? raw.line_items : [];

  const items: OrderItemRow[] = lineItems.map((li) => ({
    product_id:
      li.product_id !== null && li.product_id !== undefined
        ? String(li.product_id)
        : null,
    sku: cleanStr(li.sku),
    name: cleanStr(li.name),
    quantity: Math.max(1, Math.trunc(toNumber(li.quantity, 1))),
    price: li.price !== null && li.price !== undefined ? toNumber(li.price) : null,
    total: li.total !== null && li.total !== undefined ? toNumber(li.total) : null,
    product_type: detectProductType(li),
  }));

  const total = toNumber(raw.total);
  // Woo REST nema uvek zaseban subtotal na nivou porudžbine → sumiramo stavke.
  const subtotalFromItems = items.reduce((s, it) => s + (it.total ?? 0), 0);
  const subtotal =
    raw.subtotal !== null && raw.subtotal !== undefined
      ? toNumber(raw.subtotal)
      : subtotalFromItems || null;

  const paymentMethod = cleanStr(raw.payment_method);

  // created_at: originalni datum izvora (pravilo #5). GMT varijanta ima prednost.
  const createdAt =
    cleanStr(raw.date_created_gmt) ??
    cleanStr(raw.date_created) ??
    new Date().toISOString(); // krajnji fallback ako izvor ne pošalje datum
  const updatedAt =
    cleanStr(raw.date_modified_gmt) ??
    cleanStr(raw.date_modified) ??
    createdAt;

  const firstName = cleanStr(raw.billing?.first_name);
  const lastName = cleanStr(raw.billing?.last_name);
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const email = cleanStr(raw.billing?.email)?.toLowerCase() ?? null;

  const netProfit = computeNetProfit(
    items,
    productsBySku,
    site,
    paymentMethod,
    total,
  );

  const order: OrderRow = {
    site_id: site.id,
    woo_order_id: String(raw.id ?? ""),
    number: cleanStr(raw.number),
    source: "woocommerce",
    status: cleanStr(raw.status),
    customer_email: email,
    customer_name: fullName,
    currency: cleanStr(raw.currency),
    total,
    subtotal,
    net_profit: netProfit,
    payment_method: paymentMethod,
    created_at: createdAt,
    updated_at: updatedAt,
  };

  // Kupca vezujemo samo ako imamo email (dedup ključ, pravilo #18).
  const customer: CustomerUpsert | null = email
    ? {
        email,
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        amount: total,
        orderDate: createdAt,
      }
    : null;

  return { order, items, customer };
}
