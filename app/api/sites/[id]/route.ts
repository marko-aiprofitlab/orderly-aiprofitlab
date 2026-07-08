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
 * PATCH /api/sites/[id] — izmena sajta. Tajne se upisuju samo ako je poslata
 * neprazna vrednost (prazno polje = ne diraj postojeću). Write preko admin
 * klijenta (`authenticated` nema UPDATE policy).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizovano." }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  const valid = validateSiteInput(body, false);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const updates = buildSiteWriteObject(body, false);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nema izmena." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sites")
    .update(updates)
    .eq("id", id)
    .select(SITE_CLIENT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Sajt nije pronađen." }, { status: 404 });
  }

  return NextResponse.json({
    site: toSiteListItem(data as Record<string, unknown>),
  });
}

/**
 * DELETE /api/sites/[id] — brisanje sajta. Povezani redovi (orders, products,
 * subscriptions, sync_log, sound_settings) padaju uz `on delete cascade`.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizovano." }, { status: 401 });
  }

  const { id } = await params;

  const admin = createAdminClient();
  const { error } = await admin.from("sites").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
