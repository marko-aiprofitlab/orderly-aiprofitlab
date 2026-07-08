import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_CLIENT_COLUMNS, toSiteListItem } from "@/lib/sites";
import { SitesManager } from "@/components/settings/sites-manager";

/**
 * Settings → Sajtovi (Korak 1.1). CRUD prodajnih kanala.
 *
 * Server komponenta radi inicijalni fetch (bez tajni) i predaje ga klijentskom
 * `SitesManager`-u koji dalje upravlja stanjem preko `/api/sites`.
 */
export default async function SitesSettingsPage() {
  // Admin (service_role) klijent: app koristi Clerk (ne Supabase Auth), pa
  // server klijent nema `authenticated` rolu i RLS ga ne pušta da čita `sites`.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sites")
    .select(SITE_CLIENT_COLUMNS)
    .order("created_at", { ascending: true });

  const sites = (data ?? []).map((row) =>
    toSiteListItem(row as Record<string, unknown>),
  );

  return <SitesManager initialSites={sites} />;
}
