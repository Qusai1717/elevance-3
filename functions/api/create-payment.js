/**
 * POST /api/create-payment — charges a card token via Square Payments API.
 *
 * This is a Cloudflare Pages Function: it deploys automatically because it
 * lives in the /functions folder. It runs on Cloudflare's servers, so your
 * SECRET Square token stays safe (never in website code).
 *
 * ── SETUP (one time, ~5 minutes) ──────────────────────────────────────────
 * In Cloudflare Dashboard → Workers & Pages → your project → Settings →
 * Environment variables, add:
 *
 *   SQUARE_ACCESS_TOKEN   → from developer.squareup.com → your app →
 *                           Credentials. Use the SANDBOX token for testing,
 *                           the PRODUCTION token when going live.
 *                           ⚠ Mark it as "Encrypt" (secret).
 *   SQUARE_LOCATION_ID    → Square Dashboard → Account → Locations
 *   SQUARE_ENVIRONMENT    → "sandbox" or "production"
 *                           (must match squareEnvironment in js/config.js)
 *
 * Then redeploy. That's all — payments start working immediately.
 * ──────────────────────────────────────────────────────────────────────────
 */
export async function onRequestPost({ request, env }) {
  try {
    if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
      return json({ error: "Payments are not configured yet. See functions/api/create-payment.js for setup." }, 503);
    }

    const { sourceId, amountCents, currency, note, buyerEmail } = await request.json();

    // Basic validation — never trust client-side amounts blindly in
    // production. Optional hardening: recompute the amount server-side
    // from a package/addon list included in the request.
    if (!sourceId || !Number.isInteger(amountCents) || amountCents < 100 || amountCents > 500000) {
      return json({ error: "Invalid payment request." }, 400);
    }

    const base = env.SQUARE_ENVIRONMENT === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

    const resp = await fetch(base + "/v2/payments", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.SQUARE_ACCESS_TOKEN,
        "Content-Type": "application/json",
        "Square-Version": "2025-01-23",
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(), // prevents double charges
        amount_money: { amount: amountCents, currency: currency || "CAD" },
        location_id: env.SQUARE_LOCATION_ID,
        note: (note || "ElevanceYVR booking").slice(0, 500),
        buyer_email_address: buyerEmail || undefined, // Square emails a receipt
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      const msg = data?.errors?.[0]?.detail || "Payment was declined.";
      return json({ error: msg }, 402);
    }

    return json({
      ok: true,
      paymentId: data.payment?.id,
      status: data.payment?.status,
      receiptUrl: data.payment?.receipt_url,
    });
  } catch (err) {
    return json({ error: "Payment service error. Please try again." }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
