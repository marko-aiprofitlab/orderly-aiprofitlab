import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin klijent — ISKLJUČIVO za webhook / sync / admin rute.
 *
 * Zlatno pravilo #4: `SUPABASE_SERVICE_ROLE_KEY` zaobilazi RLS i sme da postoji
 * SAMO na serveru. `import "server-only"` baca build grešku ako se fajl ikada
 * uveze u client bundle. Eksportujemo funkciju (lazy) da se env čita tek u
 * trenutku poziva na serveru.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
