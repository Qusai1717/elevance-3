# ElevanceYVR — Premium Mobile Car Detailing Website

Production-ready static website. No build step, no framework — pure HTML/CSS/JS, optimized for Cloudflare Pages, Lighthouse 95+, SEO, and WCAG AA. Square Appointments & Square Payments ready.

## Project structure

```
elevanceyvr/
├── index.html              Home (hero, why-us, process, packages, reviews,
│                           before/after, service areas, FAQ, contact CTA)
├── services.html           Interior / Exterior / Full Detail / Add-ons
├── pricing.html            Editable pricing cards + comparison table
├── booking.html            7-step booking wizard + Square Appointments panel
├── gallery.html            Filterable gallery (Interior, Exterior, B&A, SUV…)
├── about.html              Story + values
├── contact.html            Phone, email, hours, map, quote form
├── faq.html                Accordion FAQ + FAQPage schema
├── privacy.html / terms.html / 404.html
├── blog/                   SEO blog (index + first post; templates for more)
├── functions/api/          Cloudflare Pages Functions (server-side)
│   ├── create-payment.js   Square Payments — charges cards securely
│   └── bookings.js         Stores bookings + optional notifications
├── css/style.css           Full design system (matte black / white / gold)
├── js/
│   ├── config.js           ★ EDIT ME — contact info, hours, promo + ALL Square settings
│   ├── main.js             Nav, carousel, accordion, before/after slider, reveal
│   ├── booking.js          Booking wizard + Square Payments logic
│   └── gallery.js          Gallery filters
├── assets/img/             Placeholder SVGs — replace with real photos
├── sitemap.xml, robots.txt, _headers
└── _build/                 Dev-only page templates (safe to delete; robots-blocked)
```

## 1 · Deploy to Cloudflare Pages

**Option A — drag & drop (fastest):**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Name the project `elevanceyvr`, drag the entire `elevanceyvr` folder in, deploy.
   *(Note: direct upload does not run the `/functions` backend — use Option B when you enable online payments.)*

**Option B — Git (recommended):**
1. Push this folder to a GitHub repo.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Framework preset: **None**. Build command: *(empty)*. Output directory: `/`.
4. Every push auto-deploys. Cloudflare serves `404.html` automatically, applies `_headers`, and deploys the `/functions` API endpoints.

## 2 · Connect elevanceyvr.com

1. Pages project → **Custom domains** → **Set up a custom domain** → `elevanceyvr.com`.
2. If the domain's DNS is on Cloudflare, records are added automatically; otherwise follow the CNAME instructions shown (`elevanceyvr.pages.dev`).
3. Add `www.elevanceyvr.com` too, then redirect `www` → apex (Bulk redirects). SSL is automatic.
4. After going live, submit `https://elevanceyvr.com/sitemap.xml` in [Google Search Console](https://search.google.com/search-console).

## 3 · Update business info

Almost everything lives in **`js/config.js`**: phone numbers, email, Google review link, directions link, hours, service areas, the promo banner (set `promo.enabled: false` to hide it) — and the entire `square` section.

Phone/email also appear statically in the HTML (for SEO and no-JS visitors). To change them everywhere, run a find & replace across the project for:
- `825-733-4385` and `+18257334385`
- `236-866-2347` and `+12368662347`
- `qusaisherif@elevanceyvr.com`

Prices & packages: the booking wizard reads packages/add-ons from the `catalog` section in `js/config.js`; also update the display cards in `pricing.html` (cards + table) and the packages section in `index.html`.

## 4 · Replace placeholder images

All placeholders are SVGs in `assets/img/`. Replace each with a real photo **of the same name** (or update the `src` in HTML):

| File | Used for |
|---|---|
| `hero.svg` | Home hero background (wide ~1600×900 shot of a detailed car) |
| `interior-1/2`, `exterior-1/2` | Services + gallery |
| `before-1/2`, `after-1/2` | Before/after sliders + gallery (same angle for both shots) |
| `suv-1`, `truck-1`, `sedan-1`, `luxury-1/2` | Gallery categories |
| `team-1` | About page |
| `og-image.svg` | Social sharing preview — replace with a **1200×630 JPG/PNG** and update the `og:image` / `twitter:image` URLs in every page head |

Tips: export as `.webp` or quality-80 `.jpg`, max ~1600px wide, keep the `width`/`height` + `loading="lazy"` attributes. To add gallery photos, copy a `<figure class="gallery-item" data-cat="...">` block in `gallery.html`.

## 5 · Square integration (booking + payments)

Everything Square-related is controlled from **one place**: the `square` section at the bottom of `js/config.js`. It's heavily commented — each setting explains itself. Summary:

### A. Booking with Square Appointments (recommended)

Square handles the calendar, live availability, reminders, and payments — the website stays your storefront.

1. Square Dashboard → **Appointments → Online Booking → Channels** → copy your booking page link.
2. In `js/config.js`, paste it into `squareBookingLink` and set `bookingMode: "square"`.
3. In Square Dashboard → Appointments → Settings → **Contact info & intake questions**, add custom questions: *Vehicle make, model, year, colour* and *Service address* — Square collects them during booking.
4. Create your services (Interior Detailing / Exterior Detailing / Full Detail) and add-ons in Square so customers can choose them there.

The Book Now page automatically swaps the custom wizard for a premium "Book Instantly" panel linking to your Square flow. If you copy Square's *embed widget* script URL into `squareWidgetScriptUrl`, the Square calendar renders directly inside the page instead.

### B. The built-in booking wizard (default: `bookingMode: "custom"`)

A 7-step flow with progress indicator: Package → Add-ons → Date & Time → Vehicle → Contact → Review → Payment → Confirmation. Works out of the box in pay-after-service mode with zero setup.

### C. Online card payments (Square Payments)

Two halves — public IDs in `config.js`, secret token in Cloudflare (never in code):

1. Create an app at [developer.squareup.com](https://developer.squareup.com).
2. `js/config.js`: paste `squareApplicationID`, `squareLocationID`, set `squareEnvironment: "sandbox"` (test) and `enableOnlinePayments: true`.
3. Cloudflare Pages → your project → **Settings → Environment variables**, add:
   - `SQUARE_ACCESS_TOKEN` (from developer.squareup.com — mark as **Encrypt**)
   - `SQUARE_LOCATION_ID`
   - `SQUARE_ENVIRONMENT` (`sandbox` or `production`, matching config.js)
4. Redeploy. The payment step now shows Square's secure card form, styled to match the site. Test with card `4111 1111 1111 1111`, any future expiry, CVV `111`.
5. Going live: switch both `squareEnvironment` values to `production` and swap in your production token.

**Payment behaviour** — change one line in `config.js`:
- `paymentMode: "deposit"` → charge `depositAmount` (default $50) now, rest in person *(preferred)*
- `paymentMode: "full"` → charge the full estimate online
- `paymentMode: "payAfterService"` → no online charge (cash / e-transfer)
- Disable cards entirely: `enableOnlinePayments: false` — the site falls back gracefully.
- Change the deposit: edit `depositAmount` (whole CAD dollars).

### D. Where bookings go

Every wizard booking POSTs to `/api/bookings` (`functions/api/bookings.js`). Optional, documented in that file: store bookings in Cloudflare KV, and/or set a `BOOKING_WEBHOOK_URL` env var (Zapier/Make/Slack) to get notified of each booking. If none of this is set up, customers still get their confirmation screen — you take bookings by the text/email they expect.

### E. Future features

Marked **EXTENSION POINTS** in `js/booking.js` and `functions/api/bookings.js` show exactly where promo codes, gift cards, referral discounts, fleet accounts, memberships, recurring plans, SMS/email reminders, Google Calendar sync, and an admin dashboard plug in — no redesign needed.

**Contact form**: the handler is marked `TODO` in `js/main.js`. Easiest no-code option: [Formspree](https://formspree.io) (`action="https://formspree.io/f/XXXX" method="POST"` on `#contact-form` and remove the JS intercept), or reuse the bookings webhook.

## 6 · SEO — already included

Per-page meta titles/descriptions, canonical URLs, Open Graph + Twitter Cards, Schema.org AutoDetailing markup with reviews/hours/service areas (home), FAQPage markup (FAQ), `sitemap.xml`, `robots.txt`, semantic HTML, and a blog structure targeting searches like *mobile car detailing Vancouver*, *interior detailing Vancouver*, *mobile detailing Burnaby*.

Next wins after launch: create a Google Business Profile linking to the site, gather reviews with the on-site review buttons, publish the two "coming soon" blog posts.

## Notes

- **Regenerating pages**: shared header/footer are templated in `_build/build.py`. Edit a `*.content.html` + run `python3 _build/build.py`, or edit the final HTML directly and delete `_build/`.
- **Promo banner** is session-dismissable; **gift cards** are flagged "Coming Soon" in the footer.
- Accessibility: WCAG AA contrast, keyboard-operable menu/accordion/slider/wizard, focus styles, skip link, reduced-motion support.
