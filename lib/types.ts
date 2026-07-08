/**
 * Deljeni domenski tipovi (Korak 1.1).
 *
 * Ručno održavani (nema generisanih Supabase tipova). Kada se šema `sites`
 * menja u `supabase/migrations/`, ažuriraj i ovde.
 */

/** Podržane platforme — mora se poklapati sa CHECK constraint-om na `sites.platform`. */
export type Platform = "woocommerce" | "thinkific";

export const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "woocommerce", label: "WooCommerce" },
  { value: "thinkific", label: "Thinkific" },
];

/**
 * Sajt kakav ga vidi klijent (lista/tabela/forma).
 *
 * Tajne (`consumer_secret`, `api_key`, `webhook_secret`) se NIKAD ne šalju u
 * browser (Zlatno pravilo #4 duh). Umesto vrednosti šaljemo `has_*` flagove.
 * `consumer_key` NIJE tajna (javni ključ) pa se prikazuje.
 */
export interface SiteListItem {
  id: string;
  name: string;
  platform: Platform;
  url: string | null;
  consumer_key: string | null;
  color_hex: string;
  project_type: string | null;
  default_margin_percent: number;
  base_currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  has_consumer_secret: boolean;
  has_api_key: boolean;
  has_webhook_secret: boolean;
}

/**
 * Payload za POST (kreiranje) i PATCH (izmena) sajta.
 *
 * Tajne su opcione: prazan/izostavljen string pri PATCH-u = „ne diraj postojeću
 * vrednost". Pri POST-u su obavezne po platformi (validacija na serveru).
 */
export interface SiteFormInput {
  name: string;
  platform: Platform;
  url?: string | null;
  consumer_key?: string | null;
  consumer_secret?: string | null;
  api_key?: string | null;
  webhook_secret?: string | null;
  color_hex?: string;
  project_type?: string | null;
  default_margin_percent?: number;
  base_currency?: string;
  active?: boolean;
}
