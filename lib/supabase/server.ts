import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase server klijent — za server komponente i server akcije.
 *
 * Next.js 16: `cookies()` je ASYNC (Zlatno pravilo #1) → funkcija je async i
 * radi `await cookies()`. Koristi `anon` ključ; RLS se poštuje preko sesije iz
 * cookie-ja. Kreiraj novu instancu po zahtevu (ne singleton) — cookie store je
 * vezan za pojedinačni request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Pozvano iz Server Componente gde je upis cookie-ja zabranjen.
            // Bezbedno za ignorisanje — sesiju osvežava proxy.ts (middleware).
          }
        },
      },
    },
  );
}
