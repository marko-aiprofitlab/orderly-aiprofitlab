import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  SITE_CLIENT_COLUMNS,
  toSiteListItem,
  validateSiteInput,
  buildSiteWriteObject,
} from "@/lib/sites";

/**
 * GET /api/sites — lista svih sajtova (bez tajni; tajne → `has_*` flagovi).
 * Read ide preko RLS server klijenta (`authenticated` sme SELECT).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizovano." }, { status: 401 });
  }

  // Čitamo preko admin (service_role) klijenta: app koristi Clerk za auth (ne
  // Supabase Auth), pa server klijent nema `authenticated` rolu i RLS
  // `authenticated_read_all` ga ne pušta — ruta je ionako Clerk-zaštićena,
  // a tajne skida SITE_CLIENT_COLUMNS + toSiteListItem.
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select(SITE_CLIENT_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sites: (data ?? []).map((row) => toSiteListItem(row as Record<string, unknown>)),
  });
}

/**
 * POST /api/sites — kreira sajt. Write preko admin (service_role) klijenta jer
 * `authenticated` nema INSERT policy na `sites`.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizovano." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  const valid = validateSiteInput(body, true);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sites")
    .insert(buildSiteWriteObject(body, true))
    .select(SITE_CLIENT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { site: toSiteListItem(data as Record<string, unknown>) },
    { status: 201 },
  );
}
