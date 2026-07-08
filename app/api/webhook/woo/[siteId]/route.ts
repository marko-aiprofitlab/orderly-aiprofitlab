import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { ingestWooOrder, logSync } from "@/lib/sync/db";
import type { SiteForIngest, WooOrder } from "@/lib/sync/types";

/**
 * WooCommerce webhook (Korak 1.3) — POST /api/webhook/woo/[siteId].
 *
 * JAVNA ruta (Zlatno pravilo #8 — mora proći bez Clerk 401; već je u
 * proxy.ts public listi). WooCommerce ne može do localhost → testira se samo
 * na produkcionom Vercel URL-u (Zlatno pravilo #7).
 *
 * Tok: raw body → HMAC verifikacija → ingestWooOrder → sync_log.
 * UVEK vraća 200 (Zlatno pravilo #6) — čak i na grešci, da Woo ne gomila retry-jeve.
 */

// HMAC nad SIROVIM telom → potreban Node runtime (ne Edge).
export const runtime = "nodejs";

/** Konstant-time poređenje base64 potpisa (izbegava timing napade). */
function signaturesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "base64");
  const b = Buffer.from(received, "base64");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;

  // 1) Raw body PRE JSON parse-a — HMAC se računa nad sirovim telom.
  const rawBody = await request.text();

  const admin = createAdminClient();

  // 2) Učitaj sajt (tajne + margina). Nepoznat siteId → 200 ignored (bez Woo retry-ja).
  const { data: site } = await admin
    .from("sites")
    .select(
      "id, webhook_secret, consumer_secret, default_margin_percent, active",
    )
    .eq("id", siteId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ ignored: true, reason: "unknown_site" });
  }

  // 3) HMAC verifikacija: webhook_secret, fallback consumer_secret.
  const secret =
    (site.webhook_secret as string | null) ||
    (site.consumer_secret as string | null) ||
    "";
  const signature = request.headers.get("x-wc-webhook-signature") ?? "";
  const topic = request.headers.get("x-wc-webhook-topic") ?? "";

  if (!secret) {
    await logSync(admin, {
      siteId,
      syncType: "webhook",
      status: "error",
      message: "Nema webhook_secret/consumer_secret za verifikaciju.",
    });
    return NextResponse.json({ ok: false, reason: "no_secret" });
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  if (!signature || !signaturesMatch(expected, signature)) {
    await logSync(admin, {
      siteId,
      syncType: "webhook",
      status: "error",
      message: `Neispravan HMAC potpis (topic: ${topic || "n/a"}).`,
    });
    // 200 svesno — ne želimo Woo retry oluju na loš potpis.
    return NextResponse.json({ ok: false, reason: "invalid_signature" });
  }

  // 4) Parsiraj telo. Woo „ping" pri kreiranju webhook-a šalje `{ webhook_id }` bez id-a.
  let payload: WooOrder & { webhook_id?: number };
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    await logSync(admin, {
      siteId,
      syncType: "webhook",
      status: "error",
      message: "Neispravan JSON u telu webhook-a.",
    });
    return NextResponse.json({ ok: false, reason: "invalid_json" });
  }

  if (payload.webhook_id && !payload.id) {
    return NextResponse.json({ ok: true, ping: true });
  }
  if (!payload.id) {
    return NextResponse.json({ ok: true, ignored: true, reason: "no_order_id" });
  }

  // 5) Ingest. Sve greške hvatamo → 200 + sync_log error (pravilo #6).
  const siteForIngest: SiteForIngest = {
    id: site.id as string,
    default_margin_percent: Number(site.default_margin_percent),
  };

  try {
    const { orderId } = await ingestWooOrder(admin, payload, siteForIngest);
    await logSync(admin, {
      siteId,
      syncType: "webhook",
      status: "success",
      ordersSynced: 1,
      message: `Order ${payload.number ?? payload.id} (topic: ${topic || "n/a"}).`,
    });
    return NextResponse.json({ ok: true, orderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nepoznata greška.";
    await logSync(admin, {
      siteId,
      syncType: "webhook",
      status: "error",
      message: `Ingest greška: ${message}`,
    });
    return NextResponse.json({ ok: false, reason: "ingest_error" });
  }
}
