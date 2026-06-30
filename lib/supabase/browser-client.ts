import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser klijent — MODUL-LEVEL SINGLETON.
 *
 * Zlatno pravilo #3: klijent se kreira jednom, na nivou modula, i deli kroz
 * ceo browser kontekst. Ako bi se `createBrowserClient()` pozivao unutar
 * komponente/hooka, na svaki render bi nastao novi Realtime kanal
 * (CLOSED → SUBSCRIBED petlja). Zato NIKADA ne pozivaj ovu funkciju u
 * komponenti — uvezi `supabase` instancu direktno.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/** Vraća deljeni singleton (isti objekat kao `supabase`). */
export function getBrowserClient() {
  return supabase;
}
