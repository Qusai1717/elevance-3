/**
 * POST /api/bookings — receives every booking made through the website.
 *
 * Works out of the box: stores bookings in a Cloudflare KV namespace if one
 * is bound, and can email you each booking. Both are optional — without any
 * setup this endpoint simply accepts the booking so the customer sees their
 * confirmation.
 *
 * ── OPTIONAL SETUP ────────────────────────────────────────────────────────
 * 1. STORE BOOKINGS (recommended):
 *    Cloudflare Dashboard → Workers & Pages → KV → Create namespace
 *    ("elevance-bookings"), then in your Pages project → Settings →
 *    Bindings → add KV binding named BOOKINGS → select the namespace.
 *
 * 2. EMAIL YOURSELF EACH BOOKING:
 *    Add env var BOOKING_WEBHOOK_URL pointing to any webhook that emails/
 *    notifies you (Zapier, Make.com, Slack, etc.). Each booking is POSTed
 *    to it as JSON.
 *
 * ── FUTURE EXTENSIONS (all data is already in the payload) ────────────────
 *   • Google Calendar sync: exchange a service-account JWT for a token and
 *     POST to /calendar/v3/calendars/{id}/events here.
 *   • SMS/email reminders: schedule via Twilio / Resend from this function
 *     or a Cloudflare Cron Trigger reading the BOOKINGS KV.
 *   • Admin dashboard: build a page that lists BOOKINGS KV entries.
 *   • Promo codes / gift cards / memberships: validate codes here and
 *     return an adjusted price before payment.
 * ──────────────────────────────────────────────────────────────────────────
 */
export async function onRequestPost({ request, env }) {
  try {
    const booking = await request.json();

    // Minimal sanity check
    if (!booking || !booking.customer || !booking.customer.phone || !booking.date) {
      return json({ error: "Incomplete booking." }, 400);
    }

    const id = "bk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const record = { id, ...booking, receivedAt: new Date().toISOString() };

    // 1) Store in KV (if the BOOKINGS binding exists)
    if (env.BOOKINGS) {
      await env.BOOKINGS.put(id, JSON.stringify(record));
    }

    // 2) Forward to a notification webhook (if configured)
    if (env.BOOKING_WEBHOOK_URL) {
      // fire-and-forget; don't fail the customer's booking if notify fails
      try {
        await fetch(env.BOOKING_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
      } catch (_) { /* ignore */ }
    }

    return json({ ok: true, id });
  } catch (err) {
    return json({ error: "Could not save booking." }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
