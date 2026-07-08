import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logSync } from "@/lib/sync/db";
import { syncWooSite } from "@/lib/sync/sync-woo-site";

/**
 * Ručni WooCommerce backfill (Korak 1.4) — POST /api/sync/woo/[siteId].
 *
 * ZAŠTIĆENA ruta (Clerk) — za razliku od webhook-a NIJE u proxy.ts public listi.
 * Obrađuje ograničen broj strana po pozivu i vraća kursor (`nextPage`); klijent
 * petlja dok `done` (ostaje ispod Vercel Hobby `maxDuration=60`, pravilo #16).
 *
 * Body (opciono): { page?: number, after?: string (ISO datum) }.
 */

// Woo REST fetch + Buffer/base64 → Node runtime (ne Edge).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizovano." }, { status: 401 });
  }

  const { siteId } = await params;

  let body: { page?: number; after?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: site, error } = await admin
    .from("sites")
    .select(
      "id, url, consumer_key, consumer_secret, default_margin_percent, platform, active",
    )
    .eq("id", siteId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!site) {
    return NextResponse.json({ error: "Sajt ne postoji." }, { status: 404 });
  }
  if (site.platform !== "woocommerce") {
    return NextResponse.json(
      { error: "Backfill je podržan samo za WooCommerce sajtove." },
      { status: 400 },
    );
  }
  if (!site.url || !site.consumer_key || !site.consumer_secret) {
    return NextResponse.json(
      { error: "Sajtu nedostaje URL, consumer_key ili consumer_secret." },
      { status: 400 },
    );
  }

  const startPage =
    typeof body.page === "number" && body.page > 0 ? body.page : 1;

  try {
    const result = await syncWooSite(
      admin,
      {
        id: site.id as string,
        url: site.url as string,
        consumer_key: site.consumer_key as string,
        consumer_secret: site.consumer_secret as string,
        default_margin_percent: Number(site.default_margin_percent),
      },
      { startPage, after: body.after ?? null },
    );

    await logSync(admin, {
      siteId,
      syncType: "manual",
      status: "success",
      ordersSynced: result.processed,
      message: `Backfill strane ${startPage}–${result.lastPage}/${result.totalPages} (${result.processed} porudžbina)${result.done ? " — gotovo." : "."}`,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nepoznata greška.";
    await logSync(admin, {
      siteId,
      syncType: "manual",
      status: "error",
      message: `Backfill greška (strana ${startPage}): ${message}`,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
