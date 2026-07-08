import "server-only";

import type { Platform, SiteFormInput, SiteListItem } from "@/lib/types";

/**
 * Serverski helperi za sajtove (Korak 1.1). Deljeno između `/api/sites` i
 * `/api/sites/[id]`.
 */

/** Kolone koje smemo da selektujemo za klijent — BEZ tajni. */
export const SITE_CLIENT_COLUMNS =
  "id, name, platform, url, consumer_key, color_hex, project_type, default_margin_percent, base_currency, active, created_at, updated_at, consumer_secret, api_key, webhook_secret";

const VALID_PLATFORMS: Platform[] = ["woocommerce", "thinkific"];

/** Sirov red iz baze (sa tajnama) → bezbedan `SiteListItem` (tajne → flagovi). */
export function toSiteListItem(row: Record<string, unknown>): SiteListItem {
  return {
    id: row.id as string,
    name: row.name as string,
    platform: row.platform as Platform,
    url: (row.url as string | null) ?? null,
    consumer_key: (row.consumer_key as string | null) ?? null,
    color_hex: row.color_hex as string,
    project_type: (row.project_type as string | null) ?? null,
    default_margin_percent: Number(row.default_margin_percent),
    base_currency: row.base_currency as string,
    active: row.active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    has_consumer_secret: Boolean(row.consumer_secret),
    has_api_key: Boolean(row.api_key),
    has_webhook_secret: Boolean(row.webhook_secret),
  };
}

/** Sanitizacija stringa: trim, prazan → null. */
function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Osnovna validacija payload-a. `isCreate` pooštrava obavezna polja. */
export function validateSiteInput(
  body: Partial<SiteFormInput>,
  isCreate: boolean,
): ValidationResult {
  if (isCreate || body.name !== undefined) {
    if (!clean(body.name)) return { ok: false, error: "Naziv je obavezan." };
  }
  if (isCreate || body.platform !== undefined) {
    if (!VALID_PLATFORMS.includes(body.platform as Platform)) {
      return { ok: false, error: "Nepoznata platforma." };
    }
  }
  if (body.default_margin_percent !== undefined) {
    const m = Number(body.default_margin_percent);
    if (Number.isNaN(m) || m < 0 || m > 100) {
      return { ok: false, error: "Margina mora biti između 0 i 100." };
    }
  }
  // Pri kreiranju: kredencijali obavezni po platformi.
  if (isCreate) {
    if (body.platform === "woocommerce") {
      if (!clean(body.consumer_key) || !clean(body.consumer_secret)) {
        return {
          ok: false,
          error: "WooCommerce zahteva consumer key i secret.",
        };
      }
    }
    if (body.platform === "thinkific" && !clean(body.api_key)) {
      return { ok: false, error: "Thinkific zahteva API ključ." };
    }
  }
  return { ok: true };
}

/**
 * Payload → objekat za upis u bazu. Za tajne: prazna/izostavljena vrednost se
 * IZOSTAVLJA (ne prepisuje postojeću — Zlatno pravilo: write-only tajne). Pri
 * kreiranju `includeUnset` je true da default-i baze odrade svoje.
 */
export function buildSiteWriteObject(
  body: Partial<SiteFormInput>,
  isCreate: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const plain: (keyof SiteFormInput)[] = [
    "name",
    "platform",
    "url",
    "consumer_key",
    "color_hex",
    "project_type",
    "base_currency",
  ];
  for (const key of plain) {
    if (body[key] !== undefined) {
      out[key] = clean(body[key]);
    }
  }

  if (body.default_margin_percent !== undefined) {
    out.default_margin_percent = Number(body.default_margin_percent);
  }
  if (body.active !== undefined) {
    out.active = Boolean(body.active);
  }

  // Tajne: upiši SAMO ako je poslata neprazna vrednost.
  const secrets: (keyof SiteFormInput)[] = [
    "consumer_secret",
    "api_key",
    "webhook_secret",
  ];
  for (const key of secrets) {
    const val = clean(body[key]);
    if (val) out[key] = val;
  }

  // Naziv/platforma su NOT NULL — pri kreiranju garantuj da su prisutni.
  if (isCreate) {
    out.name = clean(body.name);
    out.platform = body.platform;
  }

  return out;
}
